# backend/utils/conflict_detection.py
"""
Conflict of Interest Detection Utilities

This module provides functions to detect and prevent conflicts of interest
in complaint handling, ensuring fairness and transparency.
"""

from typing import List, Tuple, Optional, TYPE_CHECKING
import re

if TYPE_CHECKING:
    from models import Complaint, User


def normalize_name(name: str) -> str:
    """Normalize a name for comparison (lowercase, strip whitespace)."""
    return name.lower().strip()


def is_staff_mentioned_in_complaint(
    staff_name: str,
    complaint_title: str,
    complaint_description: str
) -> bool:
    """
    Check if a staff member's name is mentioned in the complaint.
    
    Uses case-insensitive substring matching. Matches whole words only
    to avoid false positives (e.g., "John" won't match "Johnson").
    
    Args:
        staff_name: The name of the staff member to check
        complaint_title: The complaint's title
        complaint_description: The complaint's description
        
    Returns:
        True if the staff name is mentioned in the complaint text
    """
    if not staff_name:
        return False
    
    # Combine title and description for searching
    full_text = f"{complaint_title or ''} {complaint_description or ''}".lower()
    staff_name_lower = normalize_name(staff_name)
    
    # Split staff name into parts (first name, last name, etc.)
    name_parts = staff_name_lower.split()
    
    # Check if full name is mentioned
    if staff_name_lower in full_text:
        return True
    
    # Check if any significant name part (length > 2) is mentioned as a whole word
    for part in name_parts:
        if len(part) > 2:  # Skip very short name parts like "Jr", "Dr"
            # Use word boundary matching
            pattern = r'\b' + re.escape(part) + r'\b'
            if re.search(pattern, full_text):
                return True
    
    return False


def get_eligible_staff_for_assignment(
    complaint: "Complaint",
    all_staff: List["User"]
) -> Tuple[List["User"], List["User"]]:
    """
    Filter staff members to exclude those mentioned in the complaint.
    
    Args:
        complaint: The complaint object
        all_staff: List of all staff user objects
        
    Returns:
        Tuple of (eligible_staff, excluded_staff)
    """
    eligible = []
    excluded = []
    
    for staff in all_staff:
        if is_staff_mentioned_in_complaint(
            staff.name,
            complaint.title,
            complaint.description
        ):
            excluded.append(staff)
        else:
            eligible.append(staff)
    
    return eligible, excluded


def can_user_verify_complaint(
    user_name: str,
    user_role: str,
    complaint_title: str,
    complaint_description: str
) -> Tuple[bool, str]:
    """
    Check if a user can verify/approve a complaint.
    
    HODs cannot verify complaints that mention them.
    
    Args:
        user_name: Name of the user trying to verify
        user_role: Role of the user (hod, principal, admin, etc.)
        complaint_title: The complaint's title
        complaint_description: The complaint's description
        
    Returns:
        Tuple of (can_verify: bool, reason: str)
        - If can verify: (True, "")
        - If blocked: (False, "reason message")
    """
    # Check if the user is mentioned in the complaint
    if is_staff_mentioned_in_complaint(user_name, complaint_title, complaint_description):
        if user_role == "hod":
            return (
                False,
                f"You cannot verify this complaint as you ({user_name}) are mentioned in it. "
                "This complaint will be escalated to a higher authority for review."
            )
        elif user_role in ["staff", "principal"]:
            return (
                False,
                f"You cannot handle this complaint as you ({user_name}) are mentioned in it."
            )
    
    return (True, "")


def get_escalation_authority(blocked_user_role: str) -> Optional[str]:
    """
    Get the role to escalate to when the current approver is blocked.
    
    Escalation hierarchy: HOD -> Principal -> Admin
    
    Args:
        blocked_user_role: Role of the user who is blocked
        
    Returns:
        Role to escalate to, or None if no escalation possible
    """
    escalation_map = {
        "hod": "principal",
        "principal": "admin",
        "staff": "hod",
    }
    return escalation_map.get(blocked_user_role)

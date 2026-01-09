#!/usr/bin/env python3
"""
Parser for UW course prerequisites
"""
import json
import re
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

class LogicType(Enum):
    AND = "AND"
    OR = "OR"

@dataclass
class CourseRequirement:
    """A single course requirement"""
    course_code: str
    grade_min: Optional[int] = None
    grade_type: Optional[str] = None

@dataclass
class PrerequisiteRule:
    """A prerequisite rule with logic (AND/OR)"""
    logic: LogicType
    requirements: list = field(default_factory=list)
    grade_min: Optional[int] = None
    grade_type: Optional[str] = None
    
    def get_all_courses(self) -> Set[str]:
        """Get all course codes in this rule"""
        courses = set()
        for req in self.requirements:
            if isinstance(req, CourseRequirement):
                courses.add(req.course_code)
            elif isinstance(req, PrerequisiteRule):
                courses.update(req.get_all_courses())
        return courses


def parse_prerequisites_html(html: str) -> Optional[PrerequisiteRule]:
    """Parse prerequisite HTML into structured rules"""
    if not html:
        return None
    
    # Pattern to extract course codes from links
    course_pattern = r'<a[^>]*>([A-Z]{2,}\s*\d{3,})</a>'
    
    # Check for top-level logic (handles HTML comments like <!-- -->)
    has_or = bool(re.search(r'Complete\s*(?:<!--\s*-->)?\s*1\s*(?:<!--\s*-->)?\s+of', html, re.IGNORECASE))
    has_all = bool(re.search(r'Complete\s*(?:<!--\s*-->)?\s+all\s+(?:<!--\s*-->)?\s+of', html, re.IGNORECASE))
    
    if has_or or has_all:
        logic = LogicType.OR if has_or else LogicType.AND
        top_rule = PrerequisiteRule(logic=logic)
        
        # Split by rule sections
        sections = re.split(r'<li[^>]*data-test="ruleView-[^"]*">', html)
        
        for section in sections[1:]:
            if not section.strip():
                continue
            
            # Check for "Must have completed" (no grade)
            if 'Must have completed' in section:
                courses = re.findall(course_pattern, section)
                for course in courses:
                    code = course.replace(' ', '').strip()
                    if code:
                        top_rule.requirements.append(CourseRequirement(course_code=code))
                continue
            
            # Check for grade requirement
            grade_match = re.search(r'grade\s+of\s+<span>(\d+)%</span>', section, re.IGNORECASE)
            if grade_match:
                grade = int(grade_match.group(1))
                is_or = bool(re.search(r'at\s+least\s+(\d+|<span>\d+</span>)', section, re.IGNORECASE))
                
                courses = re.findall(course_pattern, section)
                courses_clean = [c.replace(' ', '').strip() for c in courses if c.strip()]
                
                if len(courses_clean) == 1:
                    top_rule.requirements.append(CourseRequirement(
                        course_code=courses_clean[0],
                        grade_min=grade,
                        grade_type="at least" if is_or else "each"
                    ))
                elif len(courses_clean) > 1:
                    sub_rule = PrerequisiteRule(
                        logic=LogicType.OR if is_or else LogicType.AND,
                        grade_min=grade,
                        grade_type="at least" if is_or else "each"
                    )
                    for code in courses_clean:
                        sub_rule.requirements.append(CourseRequirement(
                            course_code=code,
                            grade_min=grade,
                            grade_type="at least" if is_or else "each"
                        ))
                    top_rule.requirements.append(sub_rule)
        
        return top_rule if top_rule.requirements else None
    
    # Fallback: just extract courses
    courses = re.findall(course_pattern, html)
    if courses:
        courses_clean = [c.replace(' ', '').strip() for c in courses if c.strip()]
        if len(courses_clean) == 1:
            return PrerequisiteRule(
                logic=LogicType.AND,
                requirements=[CourseRequirement(course_code=courses_clean[0])]
            )
        elif len(courses_clean) > 1:
            rule = PrerequisiteRule(logic=LogicType.OR)
            for code in courses_clean:
                rule.requirements.append(CourseRequirement(course_code=code))
            return rule
    
    return None


def parse_antirequisites_html(html: str) -> List[str]:
    """Parse antirequisite HTML to get course codes"""
    if not html:
        return []
    
    pattern = r'<a[^>]*>([A-Z]{2,}\s*\d{3,})</a>'
    courses = re.findall(pattern, html)
    return list(set(c.replace(' ', '').strip() for c in courses if c.strip()))


def rule_to_dict(rule: Optional[PrerequisiteRule]) -> Optional[Dict]:
    """Convert PrerequisiteRule to dict for JSON"""
    if rule is None:
        return None
    
    def serialize(req):
        if isinstance(req, CourseRequirement):
            d = {"type": "course", "course_code": req.course_code}
            if req.grade_min:
                d["grade_min"] = req.grade_min
            if req.grade_type:
                d["grade_type"] = req.grade_type
            return d
        elif isinstance(req, PrerequisiteRule):
            return {
                "type": "rule",
                "logic": req.logic.value,
                "grade_min": req.grade_min,
                "grade_type": req.grade_type,
                "requirements": [serialize(r) for r in req.requirements]
            }
        return None
    
    return {
        "logic": rule.logic.value,
        "grade_min": rule.grade_min,
        "grade_type": rule.grade_type,
        "requirements": [serialize(r) for r in rule.requirements]
    }


def load_courses() -> List[Dict]:
    """Load courses from JSON file"""
    with open('courses.clean.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def find_course(courses: List[Dict], code: str) -> Optional[Dict]:
    """Find a course by code"""
    code = code.replace(' ', '').upper()
    for course in courses:
        if course['code'].replace(' ', '').upper() == code:
            return course
    return None


def build_prerequisite_tree(courses: List[Dict], target_code: str, visited: Optional[Set[str]] = None) -> Dict:
    """Build complete prerequisite tree for a course"""
    if visited is None:
        visited = set()
    
    course = find_course(courses, target_code)
    if not course:
        return {"error": f"Course {target_code} not found"}
    
    code = target_code.replace(' ', '').upper()
    if code in visited:
        return {"course_code": code, "circular": True}
    
    visited.add(code)
    
    result = {
        "course_code": course['code'],
        "title": course['title'],
        "units": course['units'],
        "antirequisites": parse_antirequisites_html(course.get('antirequisitesHtml', '')),
        "prerequisites": None,
        "prerequisite_tree": None
    }
    
    prereq_html = course.get('prerequisitesHtml', '')
    if prereq_html:
        prereq_rule = parse_prerequisites_html(prereq_html)
        result["prerequisites"] = rule_to_dict(prereq_rule)
        
        if prereq_rule:
            all_codes = prereq_rule.get_all_courses()
            result["prerequisite_tree"] = {}
            for prereq_code in all_codes:
                subtree = build_prerequisite_tree(courses, prereq_code, visited.copy())
                result["prerequisite_tree"][prereq_code] = subtree
    
    visited.discard(code)
    return result


if __name__ == "__main__":
    # Test
    courses = load_courses()
    result = build_prerequisite_tree(courses, "MATH138")
    print(json.dumps(result, indent=2))

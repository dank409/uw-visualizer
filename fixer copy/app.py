#!/usr/bin/env python3
"""
UW Course Prerequisite Pathfinder - Web Application
"""
import os
from flask import Flask, render_template, jsonify, request
from prereq_parser import load_courses, build_prerequisite_tree, find_course

app = Flask(__name__)

# Global courses cache
_courses = None

def get_courses():
    """Load courses from JSON file (cached)"""
    global _courses
    if _courses is None:
        _courses = load_courses()
    return _courses

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/api/course/<course_code>')
def get_course(course_code):
    """Get prerequisite tree for a course"""
    courses = get_courses()
    code = course_code.replace(' ', '').upper()
    
    result = build_prerequisite_tree(courses, code)
    
    if 'error' in result:
        return jsonify(result), 404
    
    return jsonify(result)

@app.route('/api/search')
def search():
    """Search courses by code or title"""
    query = request.args.get('q', '').strip().upper()
    if not query or len(query) < 2:
        return jsonify([])
    
    courses = get_courses()
    results = []
    
    for course in courses:
        code = course['code'].replace(' ', '').upper()
        title = course.get('title', '').upper()
        
        if query in code or query in title:
            results.append({
                'code': course['code'],
                'title': course['title'],
                'units': course['units']
            })
            if len(results) >= 15:
                break
    
    return jsonify(results)

if __name__ == '__main__':
    print()
    print("=" * 50)
    print("  UW Course Prerequisite Pathfinder")
    print("=" * 50)
    print()
    print("  Open your browser to:")
    print("  http://localhost:5001")
    print()
    print("  Press Ctrl+C to stop")
    print("=" * 50)
    print()
    
    app.run(debug=True, port=5001, host='127.0.0.1')

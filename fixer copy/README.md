# UW Course Prerequisite Pathfinder

Interactive web tool to visualize course prerequisites at University of Waterloo.

## Features

- **Search any course** by code (e.g., MATH138, CS135)
- **Visual prerequisite tree** showing all required courses
- **Grade requirements** displayed (e.g., ≥70%, ≥60%)
- **Mark courses as done/in progress** to personalize your path
- **Smart filtering** - when you mark a course, irrelevant OR options are hidden
- **Antirequisite warnings** - see which courses conflict

## Installation

```bash
pip install Flask
```

Or if permission errors:
```bash
pip install --user Flask
```

## Usage

1. Start the server:
```bash
python3 app.py
```

2. Open browser to: **http://localhost:5000**

3. Enter a course code and click Search

4. Mark courses you've completed to see your personalized path

## Example: MATH138

Shows prerequisites:
- **MATH147** (any grade), OR
- **≥70% in one of**: MATH116, MATH117, MATH127, OR
- **≥60% in**: MATH137

When you mark MATH137 as done, other options hide automatically.

## Files

- `app.py` - Flask web server
- `prereq_parser.py` - Prerequisite parsing logic
- `templates/index.html` - Web interface
- `courses.clean.json` - Course data

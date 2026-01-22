export type CourseCode = string;

export type Prereq =
  | null
  | { type: "COURSE"; code: CourseCode }
  | { type: "AND"; items: Prereq[] }
  | { type: "OR"; items: Prereq[] };

export type CourseStatus = "completed" | "in_progress" | "not_taken";

// Program/Faculty types
export type ProgramId = string;

export type Program = {
  id: ProgramId;
  name: string;
  faculty: string;
  shortName?: string;
};

export type Course = {
  code: CourseCode;
  title: string;
  description?: string;
  prereq: Prereq;
  prereqText?: string;
  coreq?: Prereq;
  antireqText?: string;
  department?: string;
  units?: number;
  prereqCourses?: string[];
  coreqCourses?: string[];
  antireqCourses?: string[];
  crossListed?: string[];
  allowedPrograms?: string[];
};

// New structured prerequisite types from courses_structured.json
export type StructuredRequirement =
  | { type: "AND"; children: StructuredRequirement[] }
  | { type: "OR"; min?: number; children: StructuredRequirement[] }
  | { type: "COURSE"; code: string; units?: number }
  | { type: "LEVEL"; minLevel: string }
  | { type: "PROGRAM"; code: string }
  | { type: "NOT_PROGRAM"; code: string }
  | { type: "GRADE"; minGrade: number; children: StructuredRequirement[] }
  | { type: "NOTE"; text: string }
  | { type: "NOT"; scope?: string[]; child: StructuredRequirement }
  | { type: "COREQUISITE_REF" };

export type RawStructuredCourseData = {
  pid: string;
  code: string;
  subject?: string;
  catalog?: string;
  title: string;
  description?: string;
  units?: number;
  crossListed?: string[];
  prerequisites: StructuredRequirement | null;
  corequisites: StructuredRequirement | null;
  antirequisites: StructuredRequirement | null;
};


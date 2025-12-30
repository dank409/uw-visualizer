export type CourseCode = string;

export type Prereq =
  | null
  | { type: "COURSE"; code: CourseCode }
  | { type: "AND"; items: Prereq[] }
  | { type: "OR"; items: Prereq[] };

export type CourseStatus = "completed" | "in_progress" | "not_taken";

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
};

export type RawCourseData = {
  pid: string;
  code: string;
  title: string;
  description?: string;
  units?: number;
  prerequisitesHtml?: string | null;
  corequisitesHtml?: string | null;
  antirequisitesHtml?: string | null;
  prereqCourses?: string[];
  coreqCourses?: string[];
  antireqCourses?: string[];
  crossListed?: string[];
};


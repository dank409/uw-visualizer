import type { Program, ProgramId } from "../types";

const STORAGE_KEY = "uw-visualizer-selected-program";

// Programs based on programs.json
// These match the format used in course prerequisite HTML
export const PROGRAMS: Program[] = [
  // Computer Science / Software Engineering
  { id: "cs-bcs", name: "Computer Science (BCS)", faculty: "Mathematics", shortName: "CS" },
  { id: "cs-bmath", name: "Computer Science (BMath)", faculty: "Mathematics", shortName: "CS" },
  { id: "cs-bcs-joint", name: "Computer Science (BCS) - Joint", faculty: "Mathematics", shortName: "CS" },
  { id: "cs-bmath-joint", name: "Computer Science (BMath) - Joint", faculty: "Mathematics", shortName: "CS" },
  { id: "se", name: "Software Engineering", faculty: "Engineering", shortName: "SE" },
  { id: "cs-bba", name: "BBA & BCS Double Degree", faculty: "Mathematics", shortName: "CS/BBA" },
  { id: "data-science-bcs", name: "Data Science (BCS)", faculty: "Mathematics", shortName: "DS" },
  { id: "data-science-bmath", name: "Data Science (BMath)", faculty: "Mathematics", shortName: "DS" },
  { id: "cfm", name: "Computing and Financial Management", faculty: "Mathematics", shortName: "CFM" },
  
  // Mathematics
  { id: "math", name: "Mathematics", faculty: "Mathematics", shortName: "MATH" },
  { id: "math-joint", name: "Mathematics - Joint", faculty: "Mathematics", shortName: "MATH" },
  { id: "math-bus", name: "Mathematics / Business Administration", faculty: "Mathematics", shortName: "MATH/BUS" },
  { id: "math-cpa", name: "Mathematics / Chartered Professional Accountancy", faculty: "Mathematics", shortName: "MATH/CPA" },
  { id: "math-farm", name: "Mathematics / Financial Analysis and Risk Management", faculty: "Mathematics", shortName: "MATH/FARM" },
  { id: "math-teaching", name: "Mathematics and Teaching", faculty: "Mathematics", shortName: "MATH" },
  { id: "math-studies", name: "Mathematical Studies", faculty: "Mathematics", shortName: "MATH" },
  { id: "comp-math", name: "Computational Mathematics", faculty: "Mathematics", shortName: "CMATH" },
  { id: "it-mgmt", name: "Information Technology Management", faculty: "Mathematics", shortName: "ITM" },
  
  // Statistics & Actuarial
  { id: "stat", name: "Statistics", faculty: "Mathematics", shortName: "STAT" },
  { id: "stat-joint", name: "Statistics - Joint", faculty: "Mathematics", shortName: "STAT" },
  { id: "biostat", name: "Biostatistics", faculty: "Mathematics", shortName: "STAT" },
  { id: "actsci", name: "Actuarial Science", faculty: "Mathematics", shortName: "ACTSC" },
  { id: "actsci-joint", name: "Actuarial Science - Joint", faculty: "Mathematics", shortName: "ACTSC" },
  
  // Applied & Pure Math
  { id: "amath", name: "Applied Mathematics", faculty: "Mathematics", shortName: "AMATH" },
  { id: "amath-joint", name: "Applied Mathematics - Joint", faculty: "Mathematics", shortName: "AMATH" },
  { id: "amath-sci", name: "Applied Mathematics with Scientific Computing", faculty: "Mathematics", shortName: "AMATH" },
  { id: "pmath", name: "Pure Mathematics", faculty: "Mathematics", shortName: "PMATH" },
  { id: "pmath-joint", name: "Pure Mathematics - Joint", faculty: "Mathematics", shortName: "PMATH" },
  { id: "co", name: "Combinatorics and Optimization", faculty: "Mathematics", shortName: "CO" },
  { id: "co-joint", name: "Combinatorics and Optimization - Joint", faculty: "Mathematics", shortName: "CO" },
  { id: "math-opt-bus", name: "Mathematical Optimization – Business", faculty: "Mathematics", shortName: "CO" },
  { id: "math-opt-or", name: "Mathematical Optimization – Operations Research", faculty: "Mathematics", shortName: "CO" },
  { id: "math-fin", name: "Mathematical Finance", faculty: "Mathematics", shortName: "MATHFIN" },
  { id: "math-phys", name: "Mathematical Physics", faculty: "Mathematics", shortName: "MPHYS" },
  { id: "math-econ", name: "Mathematical Economics", faculty: "Mathematics", shortName: "MECON" },
  
  // Engineering
  { id: "ece", name: "Electrical Engineering", faculty: "Engineering", shortName: "EE" },
  { id: "ce", name: "Computer Engineering", faculty: "Engineering", shortName: "CE" },
  { id: "mech", name: "Mechanical Engineering", faculty: "Engineering", shortName: "ME" },
  { id: "mechatr", name: "Mechatronics Engineering", faculty: "Engineering", shortName: "MTE" },
  { id: "syde", name: "Systems Design Engineering", faculty: "Engineering", shortName: "SYDE" },
  { id: "cive", name: "Civil Engineering", faculty: "Engineering", shortName: "CIVE" },
  { id: "enve", name: "Environmental Engineering", faculty: "Engineering", shortName: "ENVE" },
  { id: "geoe", name: "Geological Engineering", faculty: "Engineering", shortName: "GEOE" },
  { id: "che", name: "Chemical Engineering", faculty: "Engineering", shortName: "CHE" },
  { id: "nano", name: "Nanotechnology Engineering", faculty: "Engineering", shortName: "NE" },
  { id: "bme", name: "Biomedical Engineering", faculty: "Engineering", shortName: "BME" },
  { id: "arch-eng", name: "Architectural Engineering", faculty: "Engineering", shortName: "ARCH" },
  { id: "mgmt-eng", name: "Management Engineering", faculty: "Engineering", shortName: "MSCI" },
  
  // Science
  { id: "phys", name: "Physics", faculty: "Science", shortName: "PHYS" },
  { id: "phys-joint", name: "Physics - Joint", faculty: "Science", shortName: "PHYS" },
  { id: "phys-astro", name: "Physics and Astronomy", faculty: "Science", shortName: "PHYS" },
  { id: "bio-med-phys", name: "Biological and Medical Physics", faculty: "Science", shortName: "PHYS" },
  { id: "chem", name: "Chemistry", faculty: "Science", shortName: "CHEM" },
  { id: "chem-joint", name: "Chemistry - Joint", faculty: "Science", shortName: "CHEM" },
  { id: "chem-comp", name: "Chemistry – Computational", faculty: "Science", shortName: "CHEM" },
  { id: "bio", name: "Biology", faculty: "Science", shortName: "BIOL" },
  { id: "bio-joint", name: "Biology - Joint", faculty: "Science", shortName: "BIOL" },
  { id: "biochem", name: "Biochemistry", faculty: "Science", shortName: "BCHM" },
  { id: "biochem-biotech", name: "Biochemistry – Biotechnology", faculty: "Science", shortName: "BCHM" },
  { id: "biomed-sci", name: "Biomedical Sciences", faculty: "Science", shortName: "BMS" },
  { id: "biotech-cpa", name: "Biotechnology / Chartered Professional Accountancy", faculty: "Science", shortName: "BIOTECH" },
  { id: "earth-geo", name: "Earth Sciences – Geology", faculty: "Science", shortName: "EARTH" },
  { id: "earth-geophys", name: "Earth Sciences – Geophysics", faculty: "Science", shortName: "EARTH" },
  { id: "earth-hydro", name: "Earth Sciences – Hydrogeology", faculty: "Science", shortName: "EARTH" },
  { id: "materials", name: "Materials and Nanosciences", faculty: "Science", shortName: "MATLS" },
  { id: "med-chem", name: "Medicinal Chemistry", faculty: "Science", shortName: "CHEM" },
  { id: "climate", name: "Climate and Environmental Change", faculty: "Science", shortName: "SCI" },
  { id: "sci-bus", name: "Science and Business", faculty: "Science", shortName: "SCI" },
  { id: "sci-avi", name: "Science and Aviation", faculty: "Science", shortName: "SCI" },
  
  // Health
  { id: "health-sci", name: "Health Sciences", faculty: "Health", shortName: "HLTH" },
  { id: "pub-health", name: "Public Health", faculty: "Health", shortName: "PH" },
  { id: "kin", name: "Kinesiology", faculty: "Health", shortName: "KIN" },
  { id: "rec-leis", name: "Recreation and Leisure Studies", faculty: "Health", shortName: "REC" },
  { id: "rec-lead", name: "Recreation, Leadership, and Health", faculty: "Health", shortName: "REC" },
  { id: "ther-rec", name: "Therapeutic Recreation", faculty: "Health", shortName: "REC" },
  { id: "sport-mgmt", name: "Sport and Recreation Management", faculty: "Health", shortName: "REC" },
  
  // Arts
  { id: "econ", name: "Economics", faculty: "Arts", shortName: "ECON" },
  { id: "psych-arts", name: "Psychology (Arts)", faculty: "Arts", shortName: "PSYCH" },
  { id: "psych-sci", name: "Psychology (Science)", faculty: "Science", shortName: "PSYCH" },
  { id: "poli-sci", name: "Political Science", faculty: "Arts", shortName: "PSCI" },
  { id: "soc", name: "Sociology", faculty: "Arts", shortName: "SOC" },
  { id: "hist", name: "History", faculty: "Arts", shortName: "HIST" },
  { id: "phil", name: "Philosophy", faculty: "Arts", shortName: "PHIL" },
  { id: "english-lit", name: "English – Literature", faculty: "Arts", shortName: "ENGL" },
  { id: "english-writing", name: "English – Creative and Professional Writing", faculty: "Arts", shortName: "ENGL" },
  { id: "comm-studies", name: "Communication Studies", faculty: "Arts", shortName: "COMM" },
  { id: "comm-arts", name: "Communication Arts and Design Practice", faculty: "Arts", shortName: "COMM" },
  { id: "french", name: "French", faculty: "Arts", shortName: "FR" },
  { id: "spanish", name: "Spanish", faculty: "Arts", shortName: "SPAN" },
  { id: "german", name: "German", faculty: "Arts", shortName: "GER" },
  { id: "legal", name: "Legal Studies", faculty: "Arts", shortName: "LS" },
  { id: "sds", name: "Social Development Studies", faculty: "Arts", shortName: "SDS" },
  { id: "social-work", name: "Social Work", faculty: "Arts", shortName: "SOCWK" },
  { id: "peace", name: "Peace and Conflict Studies", faculty: "Arts", shortName: "PACS" },
  { id: "anthro", name: "Anthropology", faculty: "Arts", shortName: "ANTH" },
  { id: "classics", name: "Classics", faculty: "Arts", shortName: "CLAS" },
  { id: "fine-arts", name: "Fine Arts", faculty: "Arts", shortName: "FINE" },
  { id: "music", name: "Music", faculty: "Arts", shortName: "MUSIC" },
  { id: "theatre", name: "Theatre and Performance", faculty: "Arts", shortName: "THTR" },
  { id: "ki", name: "Knowledge Integration", faculty: "Arts", shortName: "KI" },
  { id: "gbda", name: "Global Business and Digital Arts", faculty: "Arts", shortName: "GBDA" },
  
  // Environment
  { id: "env-bus", name: "Environment and Business", faculty: "Environment", shortName: "ENBUS" },
  { id: "ers", name: "Environment, Resources and Sustainability", faculty: "Environment", shortName: "ERS" },
  { id: "geog", name: "Geography and Environmental Management", faculty: "Environment", shortName: "GEOG" },
  { id: "geog-avi", name: "Geography and Aviation", faculty: "Environment", shortName: "GEOG" },
  { id: "geomat", name: "Geomatics", faculty: "Environment", shortName: "GEOM" },
  { id: "plan", name: "Planning", faculty: "Environment", shortName: "PLAN" },
  { id: "int-dev", name: "International Development", faculty: "Environment", shortName: "INTDEV" },
  
  // AFM / Business
  { id: "afm", name: "Accounting and Financial Management", faculty: "Arts", shortName: "AFM" },
  { id: "sfm", name: "Sustainability and Financial Management", faculty: "Environment", shortName: "SFM" },
  { id: "arts-bus", name: "Arts and Business", faculty: "Arts", shortName: "ARBUS" },
  
  // Architecture
  { id: "arch", name: "Architectural Studies", faculty: "Engineering", shortName: "ARCH" },
  
  // Professional
  { id: "pharm", name: "Pharmacy", faculty: "Science", shortName: "PHARM" },
  { id: "optom", name: "Optometry", faculty: "Science", shortName: "OPTOM" },
];

// Popular programs for quick access
const POPULAR_PROGRAM_IDS = [
  "cs-bcs", "cs-bmath", "se", "cs-bba", "data-science-bcs", "cfm",
  "ece", "ce", "mech", "mechatr", "syde", "bme",
  "math", "stat", "actsci", "amath", "pmath",
  "phys", "chem", "bio"
];

// Group programs by faculty for easier display, with Popular at top
export const PROGRAMS_BY_FACULTY = (() => {
  const result: Record<string, Program[]> = {
    "Popular": PROGRAMS.filter(p => POPULAR_PROGRAM_IDS.includes(p.id))
  };
  
  // Add remaining programs by faculty
  for (const program of PROGRAMS) {
    if (!result[program.faculty]) {
      result[program.faculty] = [];
    }
    result[program.faculty].push(program);
  }
  
  return result;
})();

// Mapping from HTML program names to our program IDs
// This maps the various ways programs appear in the "Enrolled in" HTML
const HTML_PROGRAM_MAPPINGS: Record<string, ProgramId[]> = {
  // CS Programs
  "H-Computer Science (BCS)": ["cs-bcs"],
  "H-Computer Science (BMath)": ["cs-bmath"],
  "JH-Computer Science (BCS)": ["cs-bcs-joint", "cs-bcs"],
  "JH-Computer Science (BMath)": ["cs-bmath-joint", "cs-bmath"],
  "H-Software Engineering": ["se"],
  "H-BBA & BCS Double Degree": ["cs-bba"],
  "H-Data Science (BCS)": ["data-science-bcs"],
  "H-Data Science (BMath)": ["data-science-bmath"],
  "H-Computing & Financial Management": ["cfm"],
  "CS-Digital Hardware Specialization": ["cs-bcs", "cs-bmath", "se"], // CS specialization
  
  // Math Programs
  "H-Mathematics": ["math"],
  "JH-Mathematics": ["math-joint", "math"],
  "H-Mathematical Studies": ["math-studies"],
  "H-Mathematics / Business Administration": ["math-bus"],
  "H-Mathematics/Chartered Professional Accountancy": ["math-cpa"],
  "H-Mathematics / Financial Analysis and Risk Management": ["math-farm"],
  "H-Mathematics and Teaching": ["math-teaching"],
  "H-Computational Mathematics": ["comp-math"],
  "H-Information Technology Management": ["it-mgmt"],
  
  // Stats & Actuarial
  "H-Statistics": ["stat"],
  "JH-Statistics": ["stat-joint", "stat"],
  "H-Biostatistics": ["biostat"],
  "H-Actuarial Science": ["actsci"],
  "JH-Actuarial Science": ["actsci-joint", "actsci"],
  "Actuarial Science Minor": ["actsci"],
  
  // Applied & Pure Math
  "H-Applied Mathematics": ["amath"],
  "JH-Applied Mathematics": ["amath-joint", "amath"],
  "H-Pure Mathematics": ["pmath"],
  "JH-Pure Mathematics": ["pmath-joint", "pmath"],
  "H-Combinatorics and Optimization": ["co"],
  "JH-Combinatorics and Optimization": ["co-joint", "co"],
  "H-Mathematical Finance": ["math-fin"],
  "H-Mathematical Physics": ["math-phys"],
  "H-Mathematical Economics": ["math-econ"],
  
  // Engineering Programs
  "H-Electrical Engineering": ["ece"],
  "H-Computer Engineering": ["ce"],
  "H-Mechanical Engineering": ["mech"],
  "H-Mechatronics Engineering": ["mechatr"],
  "H-Systems Design Engineering": ["syde"],
  "H-Civil Engineering": ["cive"],
  "H-Environmental Engineering": ["enve"],
  "H-Geological Engineering": ["geoe"],
  "H-Chemical Engineering": ["che"],
  "H-Nanotechnology Engineering": ["nano"],
  "H-Biomedical Engineering": ["bme"],
  "H-Architectural Engineering": ["arch-eng"],
  "H-Management Engineering": ["mgmt-eng"],
  
  // Science
  "H-Physics": ["phys"],
  "JH-Physics": ["phys-joint", "phys"],
  "H-Physics and Astronomy": ["phys-astro"],
  "H-Chemistry": ["chem"],
  "JH-Chemistry": ["chem-joint", "chem"],
  "H-Biology": ["bio"],
  "JH-Biology": ["bio-joint", "bio"],
  "H-Biochemistry": ["biochem"],
  "H-Biomedical Sciences": ["biomed-sci"],
  "H-Health Sciences": ["health-sci"],
  "H-Kinesiology": ["kin"],
  
  // AFM
  "H-Accounting & Financial Management": ["afm"],
  "H-Sustainability & Financial Management": ["sfm"],
  "H-Biotechnology/Chartered Professional Accountancy": ["biotech-cpa"],
};

/**
 * Get the selected program from localStorage
 */
export function getSelectedProgram(): ProgramId | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Set the selected program in localStorage
 */
export function setSelectedProgram(programId: ProgramId | null): void {
  if (typeof window === "undefined") return;
  if (programId) {
    localStorage.setItem(STORAGE_KEY, programId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  // Dispatch event for components to update
  window.dispatchEvent(new CustomEvent("programChanged", { detail: programId }));
}

/**
 * Get program by ID
 */
export function getProgram(programId: ProgramId): Program | undefined {
  return PROGRAMS.find(p => p.id === programId);
}

/**
 * Map structured program names to our program IDs
 * Returns array of program IDs that match the given program names
 */
export function mapProgramNamesToIds(programNames: string[] | undefined): ProgramId[] {
  if (!programNames || programNames.length === 0) return [];

  const allowedPrograms: ProgramId[] = [];

  for (const programName of programNames) {
    // Look up the program in our mappings
    const mappedIds = HTML_PROGRAM_MAPPINGS[programName];
    if (mappedIds) {
      for (const id of mappedIds) {
        if (!allowedPrograms.includes(id)) {
          allowedPrograms.push(id);
        }
      }
    }
  }

  return allowedPrograms;
}

/**
 * Check if a course is accessible to the selected program
 * Uses the allowedPrograms field from the course data
 */
export function isCourseAccessibleToProgram(
  courseCode: string,
  programId: ProgramId | null,
  allowedPrograms?: string[]
): boolean {
  // If no program selected, show all courses
  if (!programId) return true;

  // If we have allowedPrograms from the course data
  if (allowedPrograms && allowedPrograms.length > 0) {
    // Map the program names to our program IDs
    const mappedProgramIds = mapProgramNamesToIds(allowedPrograms);

    // If no programs mapped, course is open to all
    if (mappedProgramIds.length === 0) return true;

    // Check if user's program is in the allowed list
    return mappedProgramIds.includes(programId);
  }

  // Fallback: use heuristic based on course code prefix
  return isCourseAccessibleByPrefix(courseCode, programId);
}

/**
 * Fallback heuristic based on course code prefix
 */
function isCourseAccessibleByPrefix(courseCode: string, programId: ProgramId): boolean {
  const prefix = courseCode.match(/^[A-Z]+/)?.[0];
  if (!prefix) return true;
  
  const program = getProgram(programId);
  if (!program) return true;
  
  // Engineering courses are typically restricted to engineering students
  const engineeringPrefixes = ["ECE", "ME", "MTE", "SYDE", "CIVE", "CHE", "BME", "NE", "MSCI", "GENE"];
  const engineeringPrograms = ["ece", "ce", "mech", "mechatr", "syde", "cive", "enve", "geoe", "che", "nano", "bme", "arch-eng", "mgmt-eng", "se"];
  
  if (engineeringPrefixes.includes(prefix)) {
    return engineeringPrograms.includes(programId);
  }
  
  // CS courses are generally accessible to CS, SE, and related programs
  const csPrefixes = ["CS"];
  const csAccessiblePrograms = ["cs-bcs", "cs-bmath", "cs-bcs-joint", "cs-bmath-joint", "se", "cs-bba", "data-science-bcs", "data-science-bmath", "cfm"];
  
  if (csPrefixes.includes(prefix)) {
    return csAccessiblePrograms.includes(programId);
  }
  
  // Math courses are accessible to most math faculty students
  const mathPrefixes = ["MATH", "STAT", "CO", "PMATH", "AMATH", "ACTSC"];
  const mathPrograms = ["cs-bcs", "cs-bmath", "cs-bcs-joint", "cs-bmath-joint", "se", "cs-bba", "data-science-bcs", "data-science-bmath", "cfm",
    "math", "math-joint", "math-bus", "math-cpa", "math-farm", "math-teaching", "math-studies", "comp-math", "it-mgmt",
    "stat", "stat-joint", "biostat", "actsci", "actsci-joint",
    "amath", "amath-joint", "amath-sci", "pmath", "pmath-joint", "co", "co-joint", "math-opt-bus", "math-opt-or", "math-fin", "math-phys", "math-econ"];
  
  if (mathPrefixes.includes(prefix)) {
    return mathPrograms.includes(programId);
  }
  
  // Default: accessible
  return true;
}

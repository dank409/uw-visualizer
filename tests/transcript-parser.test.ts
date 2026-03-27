import fs from "node:fs"
import path from "node:path"
import {
  buildTranscriptPdfOptions,
  extractCoursesFromTranscriptText,
  parseTranscriptPdfData,
} from "../src/lib/transcriptParser"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

async function run() {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "course", "TranscriptImportModal.tsx"),
    "utf8"
  )
  assert(!modalSource.includes("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/"), "Transcript modal should not use a CDN-hosted PDF.js worker")
  assert(modalSource.includes("parseTranscriptFile(file)"), "Transcript modal should delegate PDF parsing to the shared helper")

  const transcriptFixture = fs.readFileSync(
    path.join(process.cwd(), "tests", "fixtures", "quest-transcript.txt"),
    "utf8"
  )
  const courses = extractCoursesFromTranscriptText(transcriptFixture)

  assert(courses.length === 12, `Expected 12 courses from transcript fixture, got ${courses.length}`)
  assert(courses.some((course) => course.code === "COMMST100" && course.term === "Fall 2025"), "Expected COMMST100 in Fall 2025")
  assert(courses.some((course) => course.code === "PD1" && course.term === "Winter 2026"), "Expected PD1 in Winter 2026")
  assert(courses.some((course) => course.code === "PD11" && course.term === "Spring 2026"), "Expected PD11 in Spring 2026")
  assert(!courses.some((course) => course.code === "ECON1XX"), "Should skip transfer-credit placeholders")
  assert(!courses.some((course) => course.code === "MATH1XX"), "Should skip transfer-credit placeholders")

  const data = new Uint8Array([1, 2, 3])
  const options = buildTranscriptPdfOptions(data)
  assert(options.data === data, "PDF parser should pass the original Uint8Array through to PDF.js")
  assert(options.disableWorker === true, "Transcript import should disable PDF.js workers")

  let capturedOptions: ReturnType<typeof buildTranscriptPdfOptions> | undefined
  const parsedFromPdf = await parseTranscriptPdfData(data, {
    getDocument(optionsArg) {
      capturedOptions = optionsArg
      return {
        promise: Promise.resolve({
          numPages: 1,
          async getPage() {
            return {
              async getTextContent() {
                return {
                  items: [
                    { str: "Fall 2025", transform: [0, 0, 0, 0, 0, 100] },
                    { str: "CS", transform: [0, 0, 0, 0, 0, 90] },
                    { str: "135", transform: [0, 0, 0, 0, 40, 90] },
                    { str: "MATH", transform: [0, 0, 0, 0, 0, 80] },
                    { str: "137", transform: [0, 0, 0, 0, 40, 80] },
                  ],
                }
              },
            }
          },
        }),
      }
    },
  })

  assert(capturedOptions?.disableWorker === true, "Transcript PDF parsing should call PDF.js with workers disabled")
  assert(parsedFromPdf.some((course) => course.code === "CS135"), "Expected CS135 from mocked PDF content")
  assert(parsedFromPdf.some((course) => course.code === "MATH137"), "Expected MATH137 from mocked PDF content")

  console.log("transcript-parser.test.ts: all assertions passed")
}

run()

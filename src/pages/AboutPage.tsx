export function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-3xl font-bold">About UW Visualizer</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xl font-semibold">What is UW Visualizer?</h2>
          <p className="text-muted-foreground mb-2">
            UW Visualizer is a modern web application built for University of Waterloo students who are tired of deciphering long, recursive prerequisite descriptions in the academic calendar.
          </p>
          <p className="text-muted-foreground">
            Instead of reading dense prerequisite text, UW Visualizer shows exactly what courses you need, which ones you've already satisfied, and how close you are to becoming eligible for a target course.
          </p>
        </section>

        <div className="border-t border-border"></div>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Key Features</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Visual prerequisite graphs (full prerequisite chain for any target course)</li>
            <li>Clickable course nodes with course details</li>
            <li>Mark courses as Completed or In Progress to track eligibility</li>
          </ul>
        </section>

        <div className="border-t border-border"></div>

        <section>
          <h2 className="mb-3 text-xl font-semibold">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to the Courses page</li>
            <li>Search for the course you want to take</li>
            <li>View the prerequisite graph showing all required courses and pathways</li>
            <li>Click any course node to see details</li>
            <li>Mark courses as completed / in progress to see what you've unlocked</li>
          </ol>
        </section>

        <div className="border-t border-border"></div>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Data & Disclaimer</h2>
          <p className="text-muted-foreground mb-2">
            All course information is sourced from the University of Waterloo Undergraduate Academic Calendar:
          </p>
          <p className="text-muted-foreground mb-2">
            <a 
              href="https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/home" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/home
            </a>
          </p>
          <p className="text-muted-foreground">
            UW Visualizer is an unofficial planning tool. Always confirm requirements using the official calendar and your academic advisor when needed.
          </p>
        </section>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Student-built at the University of Waterloo
        </p>
      </div>
    </div>
  )
}

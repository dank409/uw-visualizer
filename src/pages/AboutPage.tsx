export function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-3xl font-bold">About UW Visualizer</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-xl font-semibold">What is UW Visualizer?</h2>
          <p className="text-muted-foreground">
            UW Visualizer is a modern web application designed to help University of Waterloo
            students visualize course prerequisite chains. It shows exactly how to get from your
            current state to eligibility for a target course.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Navigate to the Courses page</li>
            <li>Search for a course you want to take</li>
            <li>View the prerequisite graph showing all required courses</li>
            <li>Click on any course node to see details</li>
            <li>Mark courses as completed or in progress to track your progress</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Data</h2>
          <p className="text-muted-foreground">
          All course information is sourced from the University of Waterloo Undergraduate Academic Calendar:
          https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/home
          </p>
        </section>
      </div>
    </div>
  )
}
export function ProgrammesPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-3xl font-bold">Programmes</h1>
        <div className="mb-6 text-lg text-muted-foreground">
          Programme-level visualizations (majors, degrees, options) are planned for a future update.
        </div>
        <div className="mt-8 text-left">
          <h2 className="mb-4 text-xl font-semibold">Planned Features</h2>
          <p className="mb-4 text-muted-foreground">
            The programmes view will allow you to visualize full degree and major structures,
            including required courses, electives, and progression paths.
          </p>
          <div className="mt-6">
            <h3 className="mb-2 font-semibold">Example Programmes (coming soon):</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Combinatorics & Optimization</li>
              <li>Statistics</li>
              <li>Computer Science</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


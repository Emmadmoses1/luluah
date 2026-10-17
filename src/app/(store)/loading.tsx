export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 mt-10" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="skeleton h-12 w-64 rounded-full" />
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[3/4] rounded-2xl" />
            <div className="skeleton h-4 w-3/4 rounded-full mt-4" />
            <div className="skeleton h-4 w-1/3 rounded-full mt-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

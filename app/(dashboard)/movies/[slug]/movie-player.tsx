export default function MoviePlayer({ path }: { path: string }) {
  const movieName = path.split("/").pop();
  return (
    <div className="w-full mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          controls
          src={`/api/movie/play/?moviePath=${path}/${movieName}.mp4`}
          className="w-full h-full object-contain"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

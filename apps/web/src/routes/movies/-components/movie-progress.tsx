import { Progress } from "@next-media/ui/progress.tsx";
import { Film, Loader2 } from "lucide-react";

interface RemuxLoadingProps {
	progress: number;
	poster: string;
}

export function MovieProgress({ progress, poster }: RemuxLoadingProps) {
	return (
		<div className="relative aspect-video w-full bg-black rounded-lg flex flex-col items-center justify-center overflow-hidden shadow-2xl">
			<img
				key={poster}
				src={poster}
				alt="Movie Poster Background"
				className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-100"
			/>
			<div className="absolute inset-0 bg-neutral-900/70" />

			<div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-4 text-center">
				<div>
					<div className="relative mb-4">
						<Film className="h-16 w-16 text-neutral-500" aria-hidden="true" />
						<Loader2 className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-neutral-200 animate-spin" />
					</div>
				</div>

				<div>
					<h3 className="text-lg font-semibold text-white">
						Getting your video ready...
					</h3>
					<p className="mt-1 text-sm text-neutral-300">
						Optimizing file for the best playback experience.
					</p>
				</div>

				<div className="w-11/12 max-w-xs mt-6">
					<Progress value={progress} className="h-2 [&>div]:bg-neutral-200" />
					<p className="mt-1.5 text-right text-xs font-mono text-neutral-200">
						{Math.round(progress)}%
					</p>
				</div>
			</div>
		</div>
	);
}

import { AspectRatio } from "@next-media/ui/aspect-ratio.tsx";
import { Skeleton } from "@next-media/ui/skeleton.tsx";

export function MovieSkeleton() {
	return (
		<div className="group block space-y-2">
			<div className="overflow-hidden rounded-lg">
				<AspectRatio ratio={2 / 3} className="bg-neutral-800">
					<Skeleton className="h-full w-full" />
				</AspectRatio>
			</div>
			<div className="pt-1">
				<Skeleton className="h-4 w-3/4 mx-auto" />
			</div>
		</div>
	);
}

export function MovieSkeletonGrid({ count = 12 }: { count?: number }) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
			{Array.from({ length: count }).map((_, index) => (
				<MovieSkeleton key={index} />
			))}
		</div>
	);
}

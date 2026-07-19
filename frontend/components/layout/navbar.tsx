"use client";

import { Suspense } from "react";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
	ChevronDown,
	FileSpreadsheet,
	Plus,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiClient } from "@/lib/api-client";
import { UploadBatch } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
	onOpenUploadModal: () => void;
}

function NavbarContent({ onOpenUploadModal }: NavbarProps) {
	const api = useApiClient();
	const router = useRouter();
	const searchParams = useSearchParams();
	const activeBatchId = searchParams.get("batch_id");

	// Fetch all user upload runs
	const {
		data: batches = [],
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["batches"],
		queryFn: () => api.listBatches(),
	});

	// Find active batch object
	const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];

	const handleSelectBatch = (batchId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("batch_id", batchId);
		params.set("page", "1");
		router.push(`/dashboard?${params.toString()}`);
	};

	return (
		<header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
				{/* Left: Brand & Title */}
				<div className="flex items-center gap-6">
					<Link href="/dashboard" className="flex items-center gap-3 group">
						<div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
							<ShieldCheck className="size-5 text-white" />
						</div>
						<div className="flex flex-col">
							<span className="text-lg font-bold tracking-tight text-white leading-none">
								Paydash
							</span>
							<span className="text-[10px] font-mono text-indigo-400 font-medium">
								Reconciliation Engine
							</span>
						</div>
					</Link>

					{/* Batch Selector Dropdown (using shadcn DropdownMenu with Base UI render prop) */}
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									size="sm"
									className="gap-2 border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-850 hover:text-white"
								>
									<FileSpreadsheet className="size-3.5 text-indigo-400" />
									<span className="max-w-[160px] truncate">
										{activeBatch ? activeBatch.name : "Select Batch Run"}
									</span>
									<ChevronDown className="size-3.5 text-slate-400" />
								</Button>
							}
						/>
						<DropdownMenuContent
							align="start"
							className="w-80 rounded-2xl bg-slate-900 border-slate-800 shadow-2xl p-1.5"
						>
							<div className="flex items-center justify-between px-2.5 py-2">
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
									Reconciliation Runs
								</span>
								<Button
									variant="ghost"
									size="icon-xs"
									onClick={(e) => {
										e.stopPropagation();
										refetch();
									}}
									className="text-slate-400 hover:text-white"
								>
									<RefreshCw
										className={`size-3 ${isLoading ? "animate-spin" : ""}`}
									/>
								</Button>
							</div>

							<DropdownMenuSeparator className="bg-slate-850" />

							<DropdownMenuGroup>
								{batches.length === 0 ? (
									<div className="px-3 py-4 text-center text-xs text-slate-500">
										No runs uploaded yet.
									</div>
								) : (
									<div className="max-h-60 overflow-y-auto pr-1">
										{batches.map((batch: UploadBatch) => {
											const isSelected = batch.id === activeBatch?.id;
											return (
												<DropdownMenuItem
													key={batch.id}
													onClick={() => handleSelectBatch(batch.id)}
													className={`w-full p-2.5 rounded-xl cursor-pointer transition-all flex flex-col items-start gap-1 ${
														isSelected
															? "bg-indigo-600/10 text-white font-medium"
															: "hover:bg-slate-800/60 text-slate-300"
													}`}
												>
													<div className="flex w-full items-center justify-between">
														<span className="text-xs font-semibold truncate max-w-[170px]">
															{batch.name}
														</span>
														<span className="text-[9px] text-slate-400 font-mono">
															{formatDate(batch.created_at)}
														</span>
													</div>
													<div className="flex w-full items-center justify-between text-[11px] text-slate-400">
														<span>{batch.total_orders_count} orders</span>
														<span className="text-amber-400 font-mono">
															{formatCurrency(batch.dispute_amount)} at risk
														</span>
													</div>
												</DropdownMenuItem>
											);
										})}
									</div>
								)}
							</DropdownMenuGroup>

							<DropdownMenuSeparator className="bg-slate-850" />

							<DropdownMenuItem
								nativeButton
								render={
									<Button
										onClick={onOpenUploadModal}
										className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-300 text-xs font-medium transition-all"
									>
										<Plus className="size-3.5" />
										<span>Upload New Dataset Run</span>
									</Button>
								}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Right: Upload Action & User Profile */}
				<div className="flex items-center gap-3">
					<Button
						onClick={onOpenUploadModal}
						className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 px-4 h-8"
					>
						<Plus className="size-3.5" data-icon="inline-start" />
						<span className="hidden sm:inline">New Run</span>
					</Button>

					<div className="h-4 w-px bg-slate-800 mx-1" />

					{/* Clerk User Button */}
					<UserButton
						appearance={{
							elements: {
								userButtonAvatarBox:
									"h-9 w-9 ring-2 ring-indigo-500/30 rounded-full",
							},
						}}
					/>
				</div>
			</div>
		</header>
	);
}

export function Navbar(props: NavbarProps) {
	return (
		<Suspense
			fallback={
				<header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md h-16" />
			}
		>
			<NavbarContent {...props} />
		</Suspense>
	);
}

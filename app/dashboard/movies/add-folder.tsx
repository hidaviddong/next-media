"use client";
import { Plus } from "lucide-react";
import AddFolderDialog from "./add-folder-dialog";
import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { addFolderDialogOpenAtom } from "@/lib/store";

export default function AddFolder() {
  const setAddFolderDialogOpen = useSetAtom(addFolderDialogOpenAtom);
  return (
    <div className="">
      <Button onClick={() => setAddFolderDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Folder
      </Button>
      <AddFolderDialog />
    </div>
  );
}

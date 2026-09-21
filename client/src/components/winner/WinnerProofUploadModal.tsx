import React, { useState, useRef } from 'react';
import type { Winner } from '../../types/winner';

interface WinnerProofUploadModalProps {
  winner: Winner;
  isOpen: boolean;
  onClose: () => void;
  onUpload: (winnerId: string, file: File) => Promise<{ success: boolean; error?: string }>;
}

export const WinnerProofUploadModal: React.FC<WinnerProofUploadModalProps> = ({
  winner,
  isOpen,
  onClose,
  onUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a proof scorecard image before submitting.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    const res = await onUpload(winner.id, selectedFile);
    setUploading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to upload proof. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Winner Proof</h3>
            <p className="text-xs text-slate-500">
              {winner.drawTitle || 'Monthly Draw'} &bull; {winner.matchCount} Matches &bull;{' '}
              <strong className="text-emerald-600">₹{winner.prizeAmount.toLocaleString('en-IN')}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Previous Rejection Alert */}
        {winner.verificationStatus === 'REJECTED' && winner.rejectionReason && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
            <strong className="font-semibold block mb-1">Previous Submission Rejected:</strong>
            {winner.rejectionReason}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-950"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-2">
                <img
                  src={previewUrl}
                  alt="Proof Preview"
                  className="max-h-48 mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 object-contain"
                />
                <p className="text-xs text-slate-500">Click to replace selected image</p>
              </div>
            ) : (
              <div className="space-y-1 text-slate-500">
                <div className="text-3xl mb-1">&#128247;</div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to select scorecard screenshot
                </p>
                <p className="text-[11px] text-slate-400">JPEG, PNG, or WebP (max 5MB)</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 space-y-1">
            <p>&bull; Proof should clearly display your scorecard with date and Stableford points.</p>
            <p>&bull; Uploaded proof is encrypted and stored in private storage for admin compliance review.</p>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {uploading ? 'Uploading Proof...' : 'Submit Proof for Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

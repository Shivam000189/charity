import React, { useState, useEffect } from 'react';
import type { Charity, CreateCharityInput, UpdateCharityInput, CharityEvent } from '../../types/charity';
import { useAdminCharities } from '../../hooks/useAdminCharities';

interface CharityFormProps {
  initialData?: Charity | null;
  onSubmit: (data: CreateCharityInput | UpdateCharityInput) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  submitting?: boolean;
}

export const CharityForm: React.FC<CharityFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const isEditing = Boolean(initialData);
  const { uploadImage } = useAdminCharities();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Education');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState<CharityEvent[]>([]);
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setCategory(initialData.category || 'Education');
      setLogoUrl(initialData.logoUrl || '');
      setWebsiteUrl(initialData.websiteUrl || '');
      setImages(initialData.images || []);
      setUpcomingEvents(initialData.upcomingEvents || []);
      setFeatured(initialData.featured);
      setIsActive(initialData.isActive);
    } else {
      setName('');
      setDescription('');
      setCategory('Education');
      setLogoUrl('');
      setWebsiteUrl('');
      setImages([]);
      setUpcomingEvents([]);
      setFeatured(false);
      setIsActive(true);
    }
  }, [initialData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormError(null);
    try {
      const res = await uploadImage(file);
      if (res.success && res.url) {
        setLogoUrl(res.url);
      } else {
        setFormError(res.error || 'Failed to upload image.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim() || !eventDate.trim()) {
      setFormError('Event title and date are required to add an event.');
      return;
    }

    setUpcomingEvents([
      ...upcomingEvents,
      {
        id: `ev-${Date.now()}`,
        title: eventTitle.trim(),
        date: eventDate.trim(),
        location: eventLocation.trim() || undefined,
        description: eventDesc.trim() || undefined,
      },
    ]);

    setEventTitle('');
    setEventDate('');
    setEventLocation('');
    setEventDesc('');
    setFormError(null);
  };

  const handleRemoveEvent = (index: number) => {
    setUpcomingEvents(upcomingEvents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Charity name is required.');
      return;
    }

    const payload: CreateCharityInput | UpdateCharityInput = {
      name: name.trim(),
      description: description.trim(),
      category,
      logoUrl: logoUrl.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      images,
      upcomingEvents,
      featured,
      ...(isEditing ? { isActive } : {}),
    };

    const res = await onSubmit(payload);
    if (!res.success) {
      setFormError(res.error || 'Failed to save charity.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {formError}
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Charity Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder="e.g. Clean Oceans Initiative"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="Education">Education</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Environment">Environment</option>
            <option value="Community">Community</option>
            <option value="Sports">Sports</option>
            <option value="Animal Welfare">Animal Welfare</option>
            <option value="Arts & Culture">Arts & Culture</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Full Description
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          placeholder="Describe the organization's mission, goals, and community impact..."
        />
      </div>

      {/* Website & Logo Upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Website URL
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder="https://example.org"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Logo / Cover Image
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              placeholder="https://... or upload"
            />
            <label className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 flex items-center justify-center">
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          {logoUrl && (
            <div className="mt-2 h-16 w-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Gallery Images */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Additional Gallery Images
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder="Paste image URL..."
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="px-3.5 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            Add Image
          </button>
        </div>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {images.map((img, i) => (
              <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="absolute inset-0 bg-red-600/80 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events Builder */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Upcoming Events
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="Event Title"
            className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            placeholder="Location (e.g. Agra Golf Club)"
            className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={eventDesc}
            onChange={(e) => setEventDesc(e.target.value)}
            placeholder="Brief event description..."
            className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddEvent}
            className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Add Event
          </button>
        </div>

        {/* Existing Events List */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-2 pt-2">
            {upcomingEvents.map((ev, i) => (
              <div
                key={ev.id || i}
                className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{ev.title}</span> &bull;{' '}
                  <span className="text-slate-500 dark:text-slate-400">{ev.date}</span>{' '}
                  {ev.location && <span className="text-blue-600 dark:text-blue-400">({ev.location})</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(i)}
                  className="text-red-600 hover:text-red-700 font-bold ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Featured & Active Toggles */}
      <div className="flex flex-wrap items-center gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            ★ Mark as Featured (Spotlight on Homepage)
          </span>
        </label>

        {isEditing && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Active Status (Uncheck to soft-deactivate)
            </span>
          </label>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          {submitting ? 'Saving...' : isEditing ? 'Update Charity' : 'Create Charity'}
        </button>
      </div>
    </form>
  );
};

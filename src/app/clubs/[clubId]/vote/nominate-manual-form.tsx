"use client";

import { Button } from "@/components/ui";
import {
  type FormErrors,
  NOMINATE_INPUT_CLASS,
  NOMINATE_FIELD_ERROR_CLASS,
} from "./nominate-modal-types";

interface NominateManualFormProps {
  title: string;
  author: string;
  isbn: string;
  pageCount: string;
  formErrors: FormErrors;
  submitting: boolean;
  submitError: string;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onIsbnChange: (value: string) => void;
  onPageCountChange: (value: string) => void;
  onClearFieldError: (field: keyof FormErrors) => void;
  onSubmit: () => void;
}

export function NominateManualForm({
  title,
  author,
  isbn,
  pageCount,
  formErrors,
  submitting,
  submitError,
  onTitleChange,
  onAuthorChange,
  onIsbnChange,
  onPageCountChange,
  onClearFieldError,
  onSubmit,
}: NominateManualFormProps) {
  return (
    <div className="border-t border-line pt-4 mt-2">
      <p className="text-xs uppercase tracking-wider text-ink-3 mb-3">
        Don&rsquo;t see it? Add it manually
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              onTitleChange(e.target.value);
              if (formErrors.title) onClearFieldError("title");
            }}
            placeholder="The Midnight Library"
            aria-invalid={!!formErrors.title}
            className={`${NOMINATE_INPUT_CLASS} ${formErrors.title ? "border-danger" : "border-line"}`}
          />
          {formErrors.title && <p className={NOMINATE_FIELD_ERROR_CLASS}>{formErrors.title}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">
            Author
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => {
              onAuthorChange(e.target.value);
              if (formErrors.author) onClearFieldError("author");
            }}
            placeholder="Matt Haig"
            aria-invalid={!!formErrors.author}
            className={`${NOMINATE_INPUT_CLASS} ${formErrors.author ? "border-danger" : "border-line"}`}
          />
          {formErrors.author && <p className={NOMINATE_FIELD_ERROR_CLASS}>{formErrors.author}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">
            Page count
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={pageCount}
            onChange={(e) => {
              onPageCountChange(e.target.value);
              if (formErrors.pageCount) onClearFieldError("pageCount");
            }}
            placeholder="304"
            aria-invalid={!!formErrors.pageCount}
            className={`${NOMINATE_INPUT_CLASS} ${formErrors.pageCount ? "border-danger" : "border-line"}`}
          />
          <p className="text-[11px] text-ink-3 mt-1">
            Used to track reading progress.
          </p>
          {formErrors.pageCount && <p className={NOMINATE_FIELD_ERROR_CLASS}>{formErrors.pageCount}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">
            ISBN <span className="text-ink-3 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={isbn}
            onChange={(e) => onIsbnChange(e.target.value)}
            placeholder="978-0-857-52277-7"
            className={`${NOMINATE_INPUT_CLASS} border-line`}
          />
        </div>
      </div>

      {submitError && (
        <p className="text-sm text-danger mb-3" role="alert">
          {submitError}
        </p>
      )}

      <Button
        variant="primary"
        size="md"
        className="w-full"
        loading={submitting}
        onClick={onSubmit}
      >
        Add &amp; Nominate
      </Button>
    </div>
  );
}

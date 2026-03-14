import { z } from 'zod';

// ── CA Permission enum ───────────────────────────────────────────────

export const caPermissionEnum = z.enum([
  'view_reports',
  'view_invoices',
  'view_gst',
  'approve_entries',
  'download_data',
]);
export type CaPermission = z.infer<typeof caPermissionEnum>;

// ── Invite CA ────────────────────────────────────────────────────────

export const inviteCaSchema = z.object({
  email: z.string().email('Valid email address is required'),
  permissions: z
    .array(caPermissionEnum)
    .min(1, 'At least one permission is required'),
});
export type InviteCaDto = z.infer<typeof inviteCaSchema>;

// ── Accept Invite ────────────────────────────────────────────────────

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;

// ── Create Annotation ────────────────────────────────────────────────

export const createAnnotationSchema = z.object({
  orgId: z.string().uuid('Valid organization ID is required'),
  entityType: z.enum(['journal_entry', 'invoice', 'contact'], {
    errorMap: () => ({
      message: 'Entity type must be one of: journal_entry, invoice, contact',
    }),
  }),
  entityId: z.string().uuid('Valid entity ID is required'),
  comment: z.string().min(1, 'Comment is required').max(2000, 'Comment must be under 2000 characters'),
});
export type CreateAnnotationDto = z.infer<typeof createAnnotationSchema>;

// ── Update Annotation ────────────────────────────────────────────────

export const updateAnnotationSchema = z.object({
  comment: z.string().min(1, 'Comment is required').max(2000, 'Comment must be under 2000 characters'),
});
export type UpdateAnnotationDto = z.infer<typeof updateAnnotationSchema>;

// ── Annotations Query ────────────────────────────────────────────────

export const annotationsQuerySchema = z.object({
  orgId: z.string().uuid('Valid organization ID is required'),
  entityType: z.enum(['journal_entry', 'invoice', 'contact']).optional(),
  entityId: z.string().uuid().optional(),
});
export type AnnotationsQueryDto = z.infer<typeof annotationsQuerySchema>;

// ── Approve Entry ────────────────────────────────────────────────────

export const approveEntrySchema = z.object({
  orgId: z.string().uuid('Valid organization ID is required'),
  comment: z.string().max(2000).optional(),
});
export type ApproveEntryDto = z.infer<typeof approveEntrySchema>;

// ── Reject Entry ─────────────────────────────────────────────────────

export const rejectEntrySchema = z.object({
  orgId: z.string().uuid('Valid organization ID is required'),
  reason: z.string().min(1, 'Rejection reason is required').max(2000, 'Reason must be under 2000 characters'),
});
export type RejectEntryDto = z.infer<typeof rejectEntrySchema>;

// ── Approval Queue Query ─────────────────────────────────────────────

export const approvalQueueQuerySchema = z.object({
  orgId: z.string().uuid('Valid organization ID is required'),
});
export type ApprovalQueueQueryDto = z.infer<typeof approvalQueueQuerySchema>;

// ── Export Query ─────────────────────────────────────────────────────

export const exportQuerySchema = z.object({
  fy: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Fiscal year must be in YYYY-YY format (e.g. 2025-26)'),
});
export type ExportQueryDto = z.infer<typeof exportQuerySchema>;

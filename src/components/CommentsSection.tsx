import React, { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Divider,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { format } from 'date-fns';

import { GET_COMMENTS_BY_JOB_ID, GET_COMMENTS_BY_NODE_ID } from '../gql/queries';
import { CREATE_COMMENT, DELETE_COMMENT, CREATE_JOB_ATTACHMENT_UPLOAD_URLS } from '../gql/mutations';
import { UserContext } from '../contexts/UserContext';

interface CommentAttachment {
  filename?: string;
  key: string;
  contentType: string;
  size: number;
  uploadedAt?: string | null;
  url?: string | null;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  authorType: 'STAFF' | 'CLIENT';
  createdAt: string;
  updatedAt?: string;
  isInternal: boolean;
  attachments?: CommentAttachment[] | null;
}

interface CommentsSectionProps {
  jobId: string;
  currentUser: {
    email: string;
    isStaff: boolean;
  };
  /**
   * When set, the section is scoped to a single operation (workflow node):
   * it loads/creates comments tagged with this node id (technician bench notes)
   * rather than all job-level comments. jobId is still required (attachments are
   * stored under the job and the backend validates the job).
   */
  nodeId?: string;
  /** 'comments' (default) = full job comment thread; 'notes' = per-operation bench notes (staff-only, no internal toggle). */
  variant?: 'comments' | 'notes';
}


export const CommentsSection: React.FC<CommentsSectionProps> = ({ jobId, currentUser, nodeId, variant = 'comments' }) => {
  const isNotes = variant === 'notes' || !!nodeId;
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  // Use actual GraphQL queries - backend is ready
  const USE_BACKEND = true;

  const userContext = useContext(UserContext);

  // Scope to a node (bench note) when nodeId is provided, else the whole job.
  const scopeByNode = !!nodeId;
  const { data, loading, error, refetch } = useQuery(scopeByNode ? GET_COMMENTS_BY_NODE_ID : GET_COMMENTS_BY_JOB_ID, {
    variables: scopeByNode ? { nodeId } : { jobId },
    skip: !USE_BACKEND || (scopeByNode ? !nodeId : !jobId),
    pollInterval: USE_BACKEND ? 5000 : 0, // Poll every 5 seconds for new comments
    errorPolicy: 'all', // Continue even if there are errors
  });

  // Temporary mock data - remove once backend is ready
  const [mockComments, setMockComments] = useState<Comment[]>([]);

  const comments = USE_BACKEND ? ((scopeByNode ? data?.commentsByNodeId : data?.commentsByJobId) || []) : mockComments;

  const [createCommentMutation] = useMutation(CREATE_COMMENT, {
    onCompleted: () => {
      setNewComment('');
      setIsInternal(false);
      refetch();
    },
    onError: (error) => {
      console.error('Error creating comment:', error);
    },
  });

  const [deleteCommentMutation] = useMutation(DELETE_COMMENT, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error deleting comment:', error);
    },
  });

  const [createAttachmentUploadUrls] = useMutation(CREATE_JOB_ATTACHMENT_UPLOAD_URLS);

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setAttachmentFiles(Array.from(files));
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !jobId) return;

    try {
      if (USE_BACKEND) {
        const token = await userContext.userProps?.getAccessToken();

        // Upload any selected files to S3 first, then pass the resulting
        // {key,filename,contentType,size} tuples into the createComment input
        // so the attachments are stored ON the comment (and render inline
        // beneath it) rather than on the job-level Attachments section.
        let attachmentInputs: Array<{ filename?: string; key: string; contentType: string; size: number }> = [];
        if (attachmentFiles.length > 0) {
          const filesForRequest = attachmentFiles.map((file) => ({
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          }));

          const uploadUrlResult = await createAttachmentUploadUrls({
            variables: { jobId, files: filesForRequest },
            context: { headers: { authorization: token ? `Bearer ${token}` : '' } },
          });

          const uploads = uploadUrlResult.data?.createJobAttachmentUploadUrls ?? [];

          await Promise.all(
            uploads.map(async (u: any) => {
              const file = attachmentFiles.find((f) => f.name === u.filename && f.size === u.size);
              if (!file) return;
              await fetch(u.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': u.contentType || 'application/octet-stream' },
                body: file,
              });
            })
          );

          attachmentInputs = uploads.map((u: any) => ({
            filename: u.filename,
            key: u.key,
            contentType: u.contentType,
            size: u.size,
          }));
        }

        await createCommentMutation({
          variables: {
            input: {
              jobId,
              // Tag bench notes with the operation so they show per-operation.
              ...(nodeId ? { nodeId } : {}),
              content: newComment.trim(),
              author: currentUser.email,
              authorType: currentUser.isStaff ? 'STAFF' : 'CLIENT',
              // Bench notes are staff-only by definition; full comment threads honor the toggle.
              isInternal: isNotes ? true : currentUser.isStaff ? isInternal : false,
              attachments: attachmentInputs.length > 0 ? attachmentInputs : undefined,
            },
          },
        });
      } else {
        // Temporary mock - remove once backend is ready
        const mockComment: Comment = {
          id: `comment-${Date.now()}`,
          content: newComment.trim(),
          author: currentUser.email,
          authorType: currentUser.isStaff ? 'STAFF' : 'CLIENT',
          createdAt: new Date().toISOString(),
          isInternal: currentUser.isStaff ? isInternal : false,
        };
        setMockComments([...mockComments, mockComment]);
      }
      setNewComment('');
      setIsInternal(false);
      setAttachmentFiles([]);
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      if (USE_BACKEND) {
        await deleteCommentMutation({
          variables: { id: commentId },
        });
      } else {
        // Temporary mock - remove once backend is ready
        setMockComments(mockComments.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Filter comments based on user type
  const visibleComments = (comments as Comment[]).filter((comment: Comment) => {
    if (currentUser.isStaff) {
      // Staff can see all comments
      return true;
    } else {
      // Clients can only see non-internal comments
      return !comment.isInternal;
    }
  });

  // Sort comments by creation date (newest first)
  const sortedComments = [...visibleComments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading comments. Please try again later.
      </Alert>
    );
  }

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {isNotes ? 'Notes & files' : 'Comments'}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Comments List */}
        <Box sx={{ mb: 3, maxHeight: '400px', overflowY: 'auto' }}>
          {sortedComments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {isNotes ? 'No notes yet for this operation.' : 'No comments yet. Be the first to comment!'}
            </Typography>
          ) : (
            sortedComments.map((comment) => (
              <Box
                key={comment.id}
                sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: comment.isInternal ? 'warning.light' : 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {comment.authorType === 'STAFF' ? (
                      <BusinessIcon fontSize="small" color="primary" />
                    ) : (
                      <PersonIcon fontSize="small" color="action" />
                    )}
                    <Typography variant="subtitle2" fontWeight="bold">
                      {comment.author}
                    </Typography>
                    <Chip
                      label={comment.authorType}
                      size="small"
                      color={comment.authorType === 'STAFF' ? 'primary' : 'default'}
                      sx={{ height: 20 }}
                    />
                    {comment.isInternal && (
                      <Chip
                        label="Internal"
                        size="small"
                        color="warning"
                        sx={{ height: 20 }}
                      />
                    )}
                  </Box>
                  <Box>
                    {(currentUser.isStaff || comment.author === currentUser.email) && (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteComment(comment.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </Typography>
                {Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {comment.attachments.map((att: CommentAttachment, idx: number) => {
                      const label = att.filename || 'attachment';
                      const kb = att.size > 0 ? ` (${(att.size / 1024).toFixed(1)} KB)` : '';
                      return att.url ? (
                        <Chip
                          key={`${att.key}-${idx}`}
                          icon={<AttachFileIcon />}
                          label={`${label}${kb}`}
                          size="small"
                          variant="outlined"
                          component="a"
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                        />
                      ) : (
                        <Chip
                          key={`${att.key}-${idx}`}
                          icon={<AttachFileIcon />}
                          label={`${label}${kb}`}
                          size="small"
                          variant="outlined"
                        />
                      );
                    })}
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                  {comment.updatedAt && comment.updatedAt !== comment.createdAt && ' (edited)'}
                </Typography>
              </Box>
            ))
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Add Comment Form */}
        <Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={isNotes ? 'Add a note about this operation…' : 'Add a comment...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Attach files
              <input
                type="file"
                multiple
                hidden
                onChange={handleAttachmentChange}
              />
            </Button>
            {attachmentFiles.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {attachmentFiles.length} file(s) selected
              </Typography>
            )}
          </Box>
          {!isNotes && currentUser.isStaff && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
              }
              label="Internal comment (only visible to staff)"
              sx={{ mb: 1 }}
            />
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
            >
              {isNotes ? 'Add note' : 'Post Comment'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

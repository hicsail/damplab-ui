import React, { useState, useEffect } from 'react';
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
import { format } from 'date-fns';

import { GET_COMMENTS_BY_JOB_ID } from '../gql/queries';
import { CREATE_COMMENT, DELETE_COMMENT } from '../gql/mutations';

interface Comment {
  id: string;
  content: string;
  author: string;
  authorType: 'STAFF' | 'CLIENT';
  createdAt: string;
  updatedAt?: string;
  isInternal: boolean;
}

interface CommentsSectionProps {
  jobId: string;
  currentUser: {
    email: string;
    isStaff: boolean;
  };
}


export const CommentsSection: React.FC<CommentsSectionProps> = ({ jobId, currentUser }) => {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Use actual GraphQL queries - backend is ready
  const USE_BACKEND = true;

  const { data, loading, error, refetch } = useQuery(GET_COMMENTS_BY_JOB_ID, {
    variables: { jobId },
    skip: !USE_BACKEND || !jobId, // Skip query if backend not ready or no jobId
    pollInterval: USE_BACKEND ? 5000 : 0, // Poll every 5 seconds for new comments
    errorPolicy: 'all', // Continue even if there are errors
  });

  // Temporary mock data - remove once backend is ready
  const [mockComments, setMockComments] = useState<Comment[]>([]);
  
  const comments = USE_BACKEND ? (data?.commentsByJobId || []) : mockComments;

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

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !jobId) return;

    try {
      if (USE_BACKEND) {
        await createCommentMutation({
          variables: {
            input: {
              jobId,
              content: newComment.trim(),
              author: currentUser.email,
              authorType: currentUser.isStaff ? 'STAFF' : 'CLIENT',
              isInternal: currentUser.isStaff ? isInternal : false,
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
  const visibleComments = comments.filter(comment => {
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
          Comments
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Comments List */}
        <Box sx={{ mb: 3, maxHeight: '400px', overflowY: 'auto' }}>
          {sortedComments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No comments yet. Be the first to comment!
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
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ mb: 1 }}
          />
          {currentUser.isStaff && (
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
              Post Comment
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

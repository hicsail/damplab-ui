import { Button, Typography } from '@mui/material';

interface Props {
  primaryEmail: string;
  memberEmails: string[];
  /** Members and damplab-staff. Presentation only; the server re-checks. */
  canManage: boolean;
  onManage: () => void;
}

/** "People" under the submitter line: the primary client, then the members. */
export default function JobPeopleLine({ primaryEmail, memberEmails, canManage, onManage }: Props) {
  return (
    <Typography component="div" sx={{ fontSize: 13, mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <span>
        People: Primary: {primaryEmail || '—'}
        {memberEmails.length > 0 && <> · {memberEmails.join(', ')}</>}
      </span>
      {canManage && (
        <Button size="small" onClick={onManage} sx={{ textTransform: 'none', py: 0, minHeight: 0 }}>Manage</Button>
      )}
    </Typography>
  );
}

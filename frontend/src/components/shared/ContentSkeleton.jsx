import { Grid, Card, CardContent, Skeleton } from '@mui/material';

export default function ContentSkeleton() {
  return (
    <Grid container spacing={3} aria-label="Loading content" role="status">
      {[0, 1, 2].map((item) => (
        <Grid item xs={12} sm={6} md={4} key={item}>
          <Card>
            <CardContent>
              <Skeleton variant="rounded" width={44} height={44} sx={{ mb: 2 }} />
              <Skeleton width="75%" height={32} />
              <Skeleton width="95%" />
              <Skeleton width="55%" />
              <Skeleton variant="rounded" height={40} sx={{ mt: 3 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

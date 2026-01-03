import SpecialistCard from './SpecialistCard';
import { Grid, Box, CircularProgress, Typography } from '@mui/material';

export default function SpecialistList({ specialists, onBook, isLoading }) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (specialists.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          No specialists found
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {specialists.map((specialist) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={specialist.id}>
          <SpecialistCard
            specialist={specialist}
            onBook={onBook}
          />
        </Grid>
      ))}
    </Grid>
  );
}


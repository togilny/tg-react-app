import { useState } from 'react';
import { Card, CardContent, CardActions, Button, Typography, Box, Chip, Rating } from '@mui/material';

export default function SpecialistCard({ specialist, onBook }) {
  const [imageError, setImageError] = useState(false);

  const getCategoryIcon = (category) => {
    const icons = {
      'Hair': '💇',
      'Nails': '💅',
      'Makeup': '💄'
    };
    return icons[category] || '✨';
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        }
      }}
    >
      <Box
        sx={{
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          fontSize: '3rem',
        }}
      >
        {specialist.imageUrl && !imageError ? (
          <img 
            src={specialist.imageUrl} 
            alt={`${specialist.name} logo`}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          getCategoryIcon(specialist.category)
        )}
      </Box>
      
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 700 }}>
          {specialist.name}
        </Typography>
        
        <Chip 
          label={`${specialist.category} Specialist`} 
          size="small" 
          sx={{ mb: 1 }}
        />
        
        {specialist.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {specialist.description}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
          <Rating value={specialist.rating} readOnly size="small" />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
            £{specialist.pricePerHour}/hr
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => onBook(specialist)}
          sx={{ py: 1 }}
        >
          Book Now
        </Button>
      </CardActions>
    </Card>
  );
}


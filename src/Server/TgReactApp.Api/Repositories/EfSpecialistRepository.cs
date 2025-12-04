using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

// SpecialistRepository now works with Users where IsSpecialist = true
public class EfSpecialistRepository : ISpecialistRepository
{
    private readonly GlowBookDbContext _context;

    public EfSpecialistRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    // Convert User to Specialist DTO
    private Specialist? UserToSpecialist(User? user)
    {
        if (user == null || !user.IsSpecialist) return null;
        
        return new Specialist
        {
            Id = user.Id,
            UserId = user.Id, // Same as Id now
            Name = user.Name ?? user.DisplayName ?? user.Username,
            Category = user.Category ?? "",
            Description = user.Description,
            ImageUrl = user.ImageUrl,
            PricePerHour = user.PricePerHour ?? 0,
            Rating = user.Rating ?? 5,
            CreatedAt = user.CreatedAt
        };
    }

    public List<Specialist> GetAll() =>
        _context.Users
            .Where(u => u.IsSpecialist)
            .Select(u => new Specialist
            {
                Id = u.Id,
                UserId = u.Id,
                Name = u.Name ?? u.DisplayName ?? u.Username,
                Category = u.Category ?? "",
                Description = u.Description,
                ImageUrl = u.ImageUrl,
                PricePerHour = u.PricePerHour ?? 0,
                Rating = u.Rating ?? 5,
                CreatedAt = u.CreatedAt
            })
            .ToList();

    public List<Specialist> GetByCategory(string category) =>
        _context.Users
            .Where(u => u.IsSpecialist && u.Category != null && u.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .Select(u => new Specialist
            {
                Id = u.Id,
                UserId = u.Id,
                Name = u.Name ?? u.DisplayName ?? u.Username,
                Category = u.Category ?? "",
                Description = u.Description,
                ImageUrl = u.ImageUrl,
                PricePerHour = u.PricePerHour ?? 0,
                Rating = u.Rating ?? 5,
                CreatedAt = u.CreatedAt
            })
            .ToList();

    public Specialist? GetById(Guid id)
    {
        var user = _context.Users.Find(id);
        return UserToSpecialist(user);
    }

    public Specialist? GetByUserId(Guid userId)
    {
        var user = _context.Users.Find(userId);
        return UserToSpecialist(user);
    }

    public Specialist Add(string name, string category, string? description, string? imageUrl, decimal pricePerHour, int rating, Guid? userId = null)
    {
        User user;
        
        if (userId.HasValue)
        {
            // Update existing user to be a specialist
            user = _context.Users.Find(userId.Value) ?? throw new InvalidOperationException("User not found");
            user.IsSpecialist = true;
        }
        else
        {
            // Create new user as specialist
            user = new User
            {
                Id = Guid.NewGuid(),
                Username = $"specialist_{Guid.NewGuid():N}",
                PasswordHash = "", // Can be set later
                IsSpecialist = true,
                IsAdmin = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
        }

        // Set specialist fields
        user.Name = name;
        user.DisplayName = name;
        user.Category = category;
        user.Description = description;
        user.ImageUrl = imageUrl;
        user.PricePerHour = pricePerHour;
        user.Rating = Math.Clamp(rating, 1, 5);

        _context.SaveChanges();
        
        return UserToSpecialist(user)!;
    }

    public Specialist? Update(Guid id, string name, string category, string? description, string? imageUrl, decimal pricePerHour, int rating)
    {
        var user = _context.Users.Find(id);
        if (user == null || !user.IsSpecialist) return null;

        user.Name = name;
        user.DisplayName = name;
        user.Category = category;
        user.Description = description;
        user.ImageUrl = imageUrl;
        user.PricePerHour = pricePerHour;
        user.Rating = Math.Clamp(rating, 1, 5);

        _context.SaveChanges();
        return UserToSpecialist(user);
    }

    public bool Delete(Guid id)
    {
        var user = _context.Users.Find(id);
        if (user == null || !user.IsSpecialist) return false;

        // Don't delete the user, just remove specialist status and fields
        user.IsSpecialist = false;
        user.Category = null;
        user.Description = null;
        user.ImageUrl = null;
        user.PricePerHour = null;
        user.Rating = null;
        
        _context.SaveChanges();
        return true;
    }
}


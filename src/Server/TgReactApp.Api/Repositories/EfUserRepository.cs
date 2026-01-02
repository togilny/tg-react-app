using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public class EfUserRepository : IUserRepository
{
    private readonly GlowBookDbContext _context;

    public EfUserRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    public User? GetByUsername(string username)
    {
        return _context.Users
            .FirstOrDefault(u => u.Username.ToLower() == username.ToLower());
    }

    public User? GetById(Guid id)
    {
        return _context.Users.Find(id);
    }

    public User Create(string username, string passwordHash, string? displayName = null, bool isSpecialist = false, bool mustChangePassword = false)
    {
        // First user is admin, or username "tony" is admin
        var isAdmin = !_context.Users.Any() || username.Equals("tony", StringComparison.OrdinalIgnoreCase);
        
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            PasswordHash = passwordHash,
            DisplayName = displayName,
            IsAdmin = isAdmin,
            IsSpecialist = isSpecialist,
            MustChangePassword = mustChangePassword,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.SaveChanges();

        return user;
    }

    public User? Update(Guid id, string? username = null, string? displayName = null, string? passwordHash = null, bool? mustChangePassword = null)
    {
        var user = GetById(id);
        if (user == null) return null;

        if (!string.IsNullOrWhiteSpace(username))
        {
            user.Username = username;
        }

        if (displayName != null)
        {
            user.DisplayName = displayName;
        }

        if (!string.IsNullOrWhiteSpace(passwordHash))
        {
            user.PasswordHash = passwordHash;
        }

        if (mustChangePassword.HasValue)
        {
            user.MustChangePassword = mustChangePassword.Value;
        }

        _context.SaveChanges();
        return user;
    }
}


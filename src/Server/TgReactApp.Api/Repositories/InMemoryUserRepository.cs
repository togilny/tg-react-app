using System.Collections.Concurrent;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly ConcurrentDictionary<Guid, User> _usersById = new();
    private readonly ConcurrentDictionary<string, User> _usersByUsername = new();

    public User? GetByUsername(string username)
        => _usersByUsername.TryGetValue(username.ToLowerInvariant(), out var user) ? user : null;

    public User? GetById(Guid id)
        => _usersById.TryGetValue(id, out var user) ? user : null;

    public User Create(string username, string passwordHash, string? displayName = null, bool isSpecialist = false, bool mustChangePassword = false)
    {
        // First user is admin, or username "tony" is admin
        var isAdmin = _usersById.Count == 0 || username.Equals("tony", StringComparison.OrdinalIgnoreCase);
        
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

        _usersById[user.Id] = user;
        _usersByUsername[username.ToLowerInvariant()] = user;

        return user;
    }

    public User? Update(Guid id, string? username = null, string? displayName = null, string? passwordHash = null, bool? mustChangePassword = null)
    {
        if (!_usersById.TryGetValue(id, out var user))
            return null;

        if (!string.IsNullOrWhiteSpace(username))
        {
            // Remove old username from dictionary
            _usersByUsername.TryRemove(user.Username.ToLowerInvariant(), out _);
            user.Username = username;
            _usersByUsername[username.ToLowerInvariant()] = user;
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

        return user;
    }
}


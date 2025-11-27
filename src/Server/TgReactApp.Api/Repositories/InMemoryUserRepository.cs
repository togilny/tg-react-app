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

    public User Create(string username, string passwordHash)
    {
        var user = new User(
            Guid.NewGuid(),
            username,
            passwordHash,
            DateTime.UtcNow);

        _usersById[user.Id] = user;
        _usersByUsername[username.ToLowerInvariant()] = user;

        return user;
    }
}


using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Services;

/// <summary>
/// Simple authentication service for demo purposes.
/// In production, use proper JWT tokens and secure password hashing (BCrypt, Argon2, etc.)
/// </summary>
public sealed class SimpleAuthService : IAuthService
{
    private readonly ConcurrentDictionary<string, Guid> _tokens = new();

    public string HashPassword(string password)
    {
        // Simple hash for demo - use BCrypt or Argon2 in production!
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    public bool VerifyPassword(string password, string hash)
    {
        var computedHash = HashPassword(password);
        return computedHash == hash;
    }

    public string GenerateToken(User user)
    {
        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        _tokens[token] = user.Id;
        return token;
    }

    public Guid? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        return _tokens.TryGetValue(token, out var userId) ? userId : null;
    }
}


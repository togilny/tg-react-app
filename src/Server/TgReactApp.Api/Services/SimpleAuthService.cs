using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Services;

/// <summary>
/// Simple authentication service for demo purposes.
/// In production, use proper JWT tokens and secure password hashing (BCrypt, Argon2, etc.)
/// </summary>
public sealed class SimpleAuthService : IAuthService
{
    private const string DefaultSigningKey = "dev-signing-key-change-me";
    private readonly byte[] _signingKey;

    public SimpleAuthService(IConfiguration configuration)
    {
        var key = configuration["Auth:SigningKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            key = DefaultSigningKey;
        }

        _signingKey = Encoding.UTF8.GetBytes(key);
    }

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
        var payload = new TokenPayload
        {
            UserId = user.Id,
            Exp = DateTimeOffset.UtcNow.AddDays(7).ToUnixTimeSeconds()
        };

        var json = JsonSerializer.Serialize(payload);
        var payloadB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(json));
        var sigB64 = Base64UrlEncode(Sign(Encoding.UTF8.GetBytes(payloadB64)));
        return $"{payloadB64}.{sigB64}";
    }

    public Guid? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var parts = token.Split('.', 2);
        if (parts.Length != 2) return null;

        var payloadB64 = parts[0];
        var sigB64 = parts[1];

        byte[] expectedSig;
        try
        {
            expectedSig = Sign(Encoding.UTF8.GetBytes(payloadB64));
        }
        catch
        {
            return null;
        }

        byte[] providedSig;
        try
        {
            providedSig = Base64UrlDecode(sigB64);
        }
        catch
        {
            return null;
        }

        if (!CryptographicOperations.FixedTimeEquals(expectedSig, providedSig))
        {
            return null;
        }

        TokenPayload? payload;
        try
        {
            var json = Encoding.UTF8.GetString(Base64UrlDecode(payloadB64));
            payload = JsonSerializer.Deserialize<TokenPayload>(json);
        }
        catch
        {
            return null;
        }

        if (payload == null) return null;
        if (payload.UserId == Guid.Empty) return null;
        if (payload.Exp <= DateTimeOffset.UtcNow.ToUnixTimeSeconds()) return null;

        return payload.UserId;
    }

    private byte[] Sign(byte[] data)
    {
        using var hmac = new HMACSHA256(_signingKey);
        return hmac.ComputeHash(data);
    }

    private static string Base64UrlEncode(byte[] data)
        => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string base64Url)
    {
        var padded = base64Url.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return Convert.FromBase64String(padded);
    }

    private sealed class TokenPayload
    {
        public Guid UserId { get; init; }
        public long Exp { get; init; }
    }
}


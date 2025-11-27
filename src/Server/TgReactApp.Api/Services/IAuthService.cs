using TgReactApp.Api.Models;

namespace TgReactApp.Api.Services;

public interface IAuthService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
    string GenerateToken(User user);
    Guid? ValidateToken(string token);
}


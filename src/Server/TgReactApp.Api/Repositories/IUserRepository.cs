using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface IUserRepository
{
    User? GetByUsername(string username);
    User? GetById(Guid id);
    User Create(string username, string passwordHash, string? displayName = null, bool isSpecialist = false, bool mustChangePassword = false);
    User? Update(Guid id, string? username = null, string? displayName = null, string? passwordHash = null, bool? mustChangePassword = null);
}


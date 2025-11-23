using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface ITodoRepository
{
    IReadOnlyCollection<TodoItem> GetAll();
    TodoItem? GetById(Guid id);
    TodoItem Add(string title, string? description);
    TodoItem? Update(Guid id, string title, string? description, bool isComplete);
    bool Delete(Guid id);
}


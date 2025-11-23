using TgReactApp.Api.Contracts;
using TgReactApp.Api.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddSingleton<ITodoRepository, InMemoryTodoRepository>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("spa");

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

var todos = app.MapGroup("/api/todos").WithTags("Todos");

todos.MapGet("/", (ITodoRepository repository) =>
{
    var results = repository.GetAll();
    return Results.Ok(results);
});

todos.MapGet("/{id:guid}", (Guid id, ITodoRepository repository) =>
{
    var todo = repository.GetById(id);
    return todo is null ? Results.NotFound() : Results.Ok(todo);
});

todos.MapPost("/", (CreateTodoRequest request, ITodoRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var todo = repository.Add(request.Title, request.Description);
    return Results.Created($"/api/todos/{todo.Id}", todo);
});

todos.MapPut("/{id:guid}", (Guid id, UpdateTodoRequest request, ITodoRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var updated = repository.Update(id, request.Title, request.Description, request.IsComplete);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

todos.MapDelete("/{id:guid}", (Guid id, ITodoRepository repository) =>
{
    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

app.Run();

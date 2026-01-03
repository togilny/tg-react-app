using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TgReactApp.Api.Contracts;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;
using TgReactApp.Api.Repositories;
using TgReactApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

// Configure Entity Framework with SQL Server
builder.Services.AddDbContext<GlowBookDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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

// Register repositories and services - Using EF Core for database persistence
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<INoteRepository, InMemoryNoteRepository>(); // Keep notes in-memory for now
builder.Services.AddSingleton<IAuthService>(sp =>
    new SimpleAuthService(sp.GetRequiredService<IConfiguration>()));
builder.Services.AddScoped<ITodoRepository, InMemoryTodoRepository>(); // Keep todos in-memory for now
builder.Services.AddScoped<ISpecialistRepository, EfSpecialistRepository>();
builder.Services.AddScoped<IBookingRepository, EfBookingRepository>();
builder.Services.AddScoped<IServiceRepository, EfServiceRepository>();
builder.Services.AddScoped<IClientRepository, EfClientRepository>();
builder.Services.AddScoped<IClientServicePriceRepository, EfClientServicePriceRepository>();

var app = builder.Build();

// Ensure database is created and migrated
try
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<GlowBookDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        logger.LogInformation("Initializing database...");
        
        // Optional dev-only behavior: drop and recreate the database on startup.
        // WARNING: This will remove all registered users and data.
        var recreateDbOnStartup = builder.Configuration.GetValue<bool>("Database:RecreateOnStartup");
        if (app.Environment.IsDevelopment() && recreateDbOnStartup)
        {
            logger.LogWarning("Development mode: Recreating database (Database:RecreateOnStartup=true)...");
            try
            {
                dbContext.Database.EnsureDeleted();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not delete existing database (may not exist): {Message}", ex.Message);
            }
        }
        
        dbContext.Database.EnsureCreated();
        
        // Ensure database is in MULTI_USER mode so SSMS can access it
        try
        {
            dbContext.Database.ExecuteSqlRaw("IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'GlowBookDb' AND user_access_desc = 'SINGLE_USER') ALTER DATABASE GlowBookDb SET MULTI_USER");
            logger.LogInformation("Database set to MULTI_USER mode.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not set database to MULTI_USER mode: {Message}", ex.Message);
        }
        
        logger.LogInformation("Database ready!");
        
        // Seed initial data if database is empty
        try
        {
            if (!dbContext.Services.Any())
            {
                logger.LogInformation("Seeding initial data...");
                SeedInitialData(dbContext);
                logger.LogInformation("Initial data seeded!");
            }
        }
        catch (Exception seedEx)
        {
            logger.LogError(seedEx, "Error seeding data: {Message}", seedEx.Message);
        }
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Error initializing database: {Message}", ex.Message);
    logger.LogError("Stack trace: {StackTrace}", ex.StackTrace);
    // Continue anyway - might be a connection issue that will resolve
}

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

// Authentication endpoints
var auth = app.MapGroup("/api/auth").WithTags("Auth");

auth.MapPost("/register", (RegisterRequest request, HttpContext context, IUserRepository userRepo, ISpecialistRepository specialistRepo, IAuthService authService) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3)
        {
            return Results.BadRequest(new { message = "Username must be at least 3 characters." });
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return Results.BadRequest(new { message = "Password must be at least 6 characters." });
        }

        if (userRepo.GetByUsername(request.Username) != null)
        {
            return Results.BadRequest(new { message = "Username already exists." });
        }

        // Validate specialist code if provided
        bool isSpecialist = false;
        if (!string.IsNullOrWhiteSpace(request.SpecialistCode))
        {
            var configuration = context.RequestServices.GetRequiredService<IConfiguration>();
            var validCode = configuration["SpecialistRegistrationCode"];
            if (string.IsNullOrWhiteSpace(validCode) || !request.SpecialistCode.Equals(validCode, StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(new { message = "Invalid specialist registration code." });
            }
            
            if (string.IsNullOrWhiteSpace(request.DisplayName))
            {
                return Results.BadRequest(new { message = "Display name is required when registering as a specialist." });
            }
            
            isSpecialist = true;
        }

        var passwordHash = authService.HashPassword(request.Password);
        var user = userRepo.Create(request.Username, passwordHash, request.DisplayName, isSpecialist);

        // If user is a specialist (valid code provided), update user with specialist fields
        if (isSpecialist && !string.IsNullOrWhiteSpace(request.DisplayName))
        {
            user.Name = request.DisplayName;
            user.DisplayName = request.DisplayName;
            user.Category = "General"; // Default category, can be changed later
            user.PricePerHour = 50; // Default price, can be changed later
            user.Rating = 5; // Default rating
            // Save the updated user - get context from service provider
            var dbContext = context.RequestServices.GetRequiredService<GlowBookDbContext>();
            dbContext.SaveChanges();
        }

        var token = authService.GenerateToken(user);

        return Results.Ok(new { token, username = user.Username, userId = user.Id, isAdmin = user.IsAdmin, isSpecialist = user.IsSpecialist, displayName = user.DisplayName, mustChangePassword = user.MustChangePassword });
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Registration error: {Message}\n{StackTrace}", ex.Message, ex.StackTrace);
        return Results.Problem(
            detail: ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""),
            statusCode: 500,
            title: "Registration failed"
        );
    }
});

auth.MapPost("/login", (LoginRequest request, IUserRepository userRepo, IAuthService authService) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Username and password are required." });
    }

    var user = userRepo.GetByUsername(request.Username);
    if (user == null || !authService.VerifyPassword(request.Password, user.PasswordHash))
    {
        return Results.Json(new { message = "Invalid username or password." }, statusCode: StatusCodes.Status401Unauthorized);
    }

    var token = authService.GenerateToken(user);
    return Results.Ok(new { token, username = user.Username, userId = user.Id, isAdmin = user.IsAdmin, isSpecialist = user.IsSpecialist, displayName = user.DisplayName, mustChangePassword = user.MustChangePassword });
});

// User profile endpoints
var users = app.MapGroup("/api/users").WithTags("Users");

users.MapGet("/me", (HttpContext context, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.NotFound();

    return Results.Ok(new { 
        id = user.Id, 
        username = user.Username, 
        displayName = user.DisplayName, 
        isAdmin = user.IsAdmin, 
        isSpecialist = user.IsSpecialist,
        mustChangePassword = user.MustChangePassword
    });
});

users.MapPut("/me", (UpdateUserRequest request, HttpContext context, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.NotFound();

    string? passwordHash = null;
    if (!string.IsNullOrWhiteSpace(request.Password))
    {
        passwordHash = authService.HashPassword(request.Password);
    }

    var clearMustChange = passwordHash != null ? false : (bool?)null;
    var updated = userRepo.Update(userId.Value, request.Username, request.DisplayName, passwordHash, mustChangePassword: clearMustChange);
    if (updated == null) return Results.NotFound();

    return Results.Ok(new { 
        id = updated.Id, 
        username = updated.Username, 
        displayName = updated.DisplayName, 
        isAdmin = updated.IsAdmin, 
        isSpecialist = updated.IsSpecialist,
        mustChangePassword = updated.MustChangePassword
    });
});

// Notes endpoints
var notes = app.MapGroup("/api/notes").WithTags("Notes");

notes.MapGet("/", (HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var results = repository.GetAllByUser(userId.Value);
    return Results.Ok(results);
});

notes.MapGet("/{id:guid}", (Guid id, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var note = repository.GetById(id, userId.Value);
    return note is null ? Results.NotFound() : Results.Ok(note);
});

notes.MapPost("/", (CreateNoteRequest request, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var note = repository.Add(userId.Value, request.Title, request.Content ?? string.Empty);
    return Results.Created($"/api/notes/{note.Id}", note);
});

notes.MapPut("/{id:guid}", (Guid id, UpdateNoteRequest request, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var updated = repository.Update(id, userId.Value, request.Title, request.Content ?? string.Empty);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

notes.MapDelete("/{id:guid}", (Guid id, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var deleted = repository.Delete(id, userId.Value);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Keep old todos endpoint for backward compatibility (optional)
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

// Specialists endpoints - Public
var specialists = app.MapGroup("/api/specialists").WithTags("Specialists");

specialists.MapGet("/", (ISpecialistRepository repository, string? category) =>
{
    var results = string.IsNullOrWhiteSpace(category)
        ? repository.GetAll()
        : repository.GetByCategory(category);
    return Results.Ok(results);
});

specialists.MapGet("/{id:guid}", (Guid id, ISpecialistRepository repository) =>
{
    var specialist = repository.GetById(id);
    return specialist is null ? Results.NotFound() : Results.Ok(specialist);
});

// Get current user's specialist profile
specialists.MapGet("/my-profile", (HttpContext context, ISpecialistRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var specialist = repository.GetByUserId(userId.Value);
    return specialist is null ? Results.NotFound() : Results.Ok(specialist);
});

// Admin-only specialist management
specialists.MapPost("/", (CreateSpecialistRequest request, HttpContext context, ISpecialistRepository repository,
    IUserRepository userRepo, IAuthService authService, GlowBookDbContext dbContext) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Specialist name is required." });
    
    if (string.IsNullOrWhiteSpace(request.Category))
        return Results.BadRequest(new { message = "Category is required." });

    // If admin provided username + temp password, create a real specialist user account.
    if (!string.IsNullOrWhiteSpace(request.Username) || !string.IsNullOrWhiteSpace(request.TempPassword))
    {
        if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3)
        {
            return Results.BadRequest(new { message = "Username must be at least 3 characters." });
        }

        if (string.IsNullOrWhiteSpace(request.TempPassword) || request.TempPassword.Length < 6)
        {
            return Results.BadRequest(new { message = "Temp password must be at least 6 characters." });
        }

        if (userRepo.GetByUsername(request.Username) != null)
        {
            return Results.BadRequest(new { message = "Username already exists." });
        }

        var passwordHash = authService.HashPassword(request.TempPassword);
        var createdUser = userRepo.Create(
            request.Username,
            passwordHash,
            displayName: request.Name,
            isSpecialist: true,
            mustChangePassword: true
        );

        createdUser.Name = request.Name;
        createdUser.DisplayName = request.Name;
        createdUser.Category = request.Category;
        createdUser.Description = request.Description;
        createdUser.ImageUrl = request.ImageUrl;
        createdUser.PricePerHour = request.PricePerHour;
        createdUser.Rating = Math.Clamp(request.Rating, 1, 5);
        dbContext.SaveChanges();

        var specialist = repository.GetByUserId(createdUser.Id);
        return Results.Created($"/api/specialists/{createdUser.Id}", new
        {
            specialist,
            username = createdUser.Username,
            tempPassword = request.TempPassword,
            mustChangePassword = createdUser.MustChangePassword
        });
    }

    // Fallback: create specialist profile without a user account (legacy behavior)
    var specialistNoAccount = repository.Add(request.Name, request.Category, request.Description,
        request.ImageUrl, request.PricePerHour, request.Rating);
    return Results.Created($"/api/specialists/{specialistNoAccount.Id}", specialistNoAccount);
});

specialists.MapPut("/{id:guid}", (Guid id, UpdateSpecialistRequest request, HttpContext context, 
    ISpecialistRepository repository, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.Forbid();

    // Check if user is admin OR if they're updating their own specialist profile
    if (!user.IsAdmin)
    {
        if (!user.IsSpecialist) return Results.Forbid();
        
        // Verify the specialist profile belongs to this user
        var specialist = repository.GetByUserId(userId.Value);
        if (specialist == null || specialist.Id != id) return Results.Forbid();
    }

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Specialist name is required." });

    var updated = repository.Update(id, request.Name, request.Category, request.Description,
        request.ImageUrl, request.PricePerHour, request.Rating);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

specialists.MapDelete("/{id:guid}", (Guid id, HttpContext context, ISpecialistRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.Forbid();

    // Check if user is admin OR if they're deleting their own specialist profile
    if (!user.IsAdmin)
    {
        if (!user.IsSpecialist) return Results.Forbid();
        
        // Verify the specialist profile belongs to this user
        var specialist = repository.GetByUserId(userId.Value);
        if (specialist == null || specialist.Id != id) return Results.Forbid();
    }

    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Specialist Availability Endpoints
specialists.MapGet("/{id:guid}/availability", (Guid id, GlowBookDbContext dbContext, IUserRepository userRepo) =>
{
    var specialist = userRepo.GetById(id);
    if (specialist == null || !specialist.IsSpecialist) return Results.NotFound();

    var offDays = dbContext.SpecialistOffDays
        .Where(o => o.SpecialistId == id)
        .OrderBy(o => o.Date)
        .Select(o => new { o.Id, Date = o.Date.ToString("yyyy-MM-dd"), o.Reason })
        .ToList();

    var breaks = dbContext.SpecialistBreaks
        .Where(b => b.SpecialistId == id)
        .OrderBy(b => b.DayOfWeek)
        .ThenBy(b => b.StartTime)
        .Select(b => new { 
            b.Id, 
            b.DayOfWeek, 
            StartTime = b.StartTime.ToString("HH:mm"), 
            EndTime = b.EndTime.ToString("HH:mm"), 
            b.Description, 
            b.IsRecurring, 
            SpecificDate = b.SpecificDate.HasValue ? b.SpecificDate.Value.ToString("yyyy-MM-dd") : null 
        })
        .ToList();

    return Results.Ok(new { offDays, breaks });
});

specialists.MapGet("/my-availability", (HttpContext context, GlowBookDbContext dbContext, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var offDays = dbContext.SpecialistOffDays
        .Where(o => o.SpecialistId == userId.Value)
        .OrderBy(o => o.Date)
        .Select(o => new { o.Id, Date = o.Date.ToString("yyyy-MM-dd"), o.Reason })
        .ToList();

    var breaks = dbContext.SpecialistBreaks
        .Where(b => b.SpecialistId == userId.Value)
        .OrderBy(b => b.DayOfWeek)
        .ThenBy(b => b.StartTime)
        .Select(b => new { 
            b.Id, 
            b.DayOfWeek, 
            StartTime = b.StartTime.ToString("HH:mm"), 
            EndTime = b.EndTime.ToString("HH:mm"), 
            b.Description, 
            b.IsRecurring, 
            SpecificDate = b.SpecificDate.HasValue ? b.SpecificDate.Value.ToString("yyyy-MM-dd") : null 
        })
        .ToList();

    return Results.Ok(new { offDays, breaks });
});

// Specialist Appointments (bookings where they are the specialist)
specialists.MapGet("/my-appointments", (HttpContext context, IBookingRepository bookingRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var appointments = bookingRepo.GetBySpecialistId(userId.Value);
    return Results.Ok(appointments);
});

// Off Days Management
specialists.MapPost("/my-off-days", (CreateOffDayRequest request, HttpContext context, GlowBookDbContext dbContext, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    // Check if off day already exists
    var existing = dbContext.SpecialistOffDays.FirstOrDefault(o => o.SpecialistId == userId.Value && o.Date == request.Date);
    if (existing != null) return Results.BadRequest(new { message = "Off day already exists for this date." });

    var offDay = new SpecialistOffDay
    {
        Id = Guid.NewGuid(),
        SpecialistId = userId.Value,
        Date = request.Date,
        Reason = request.Reason,
        CreatedAt = DateTime.UtcNow
    };

    dbContext.SpecialistOffDays.Add(offDay);
    dbContext.SaveChanges();

    return Results.Created($"/api/specialists/my-off-days/{offDay.Id}", new { offDay.Id, Date = offDay.Date.ToString("yyyy-MM-dd"), offDay.Reason });
});

specialists.MapDelete("/my-off-days/{id:guid}", (Guid id, HttpContext context, GlowBookDbContext dbContext, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var offDay = dbContext.SpecialistOffDays.FirstOrDefault(o => o.Id == id && o.SpecialistId == userId.Value);
    if (offDay == null) return Results.NotFound();

    dbContext.SpecialistOffDays.Remove(offDay);
    dbContext.SaveChanges();

    return Results.NoContent();
});

// Bulk delete off days
specialists.MapPost("/my-off-days/bulk-delete", (BulkDeleteRequest request, HttpContext context, GlowBookDbContext dbContext, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var offDaysToDelete = dbContext.SpecialistOffDays
        .Where(o => request.Ids.Contains(o.Id) && o.SpecialistId == userId.Value)
        .ToList();

    dbContext.SpecialistOffDays.RemoveRange(offDaysToDelete);
    dbContext.SaveChanges();

    return Results.Ok(new { deleted = offDaysToDelete.Count });
});

// Breaks Management
specialists.MapPost("/my-breaks", (CreateBreakRequest request, HttpContext context, GlowBookDbContext dbContext, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    if (!TimeOnly.TryParse(request.StartTime, out var startTime) || !TimeOnly.TryParse(request.EndTime, out var endTime))
        return Results.BadRequest(new { message = "Invalid time format. Use HH:mm format." });

    if (startTime >= endTime)
        return Results.BadRequest(new { message = "Start time must be before end time." });

    var breakItem = new SpecialistBreak
    {
        Id = Guid.NewGuid(),
        SpecialistId = userId.Value,
        DayOfWeek = request.DayOfWeek,
        StartTime = startTime,
        EndTime = endTime,
        Description = request.Description,
        IsRecurring = request.IsRecurring,
        SpecificDate = request.SpecificDate,
        CreatedAt = DateTime.UtcNow
    };

    dbContext.SpecialistBreaks.Add(breakItem);
    dbContext.SaveChanges();

    return Results.Created($"/api/specialists/my-breaks/{breakItem.Id}", new { 
        breakItem.Id, 
        breakItem.DayOfWeek, 
        StartTime = breakItem.StartTime.ToString("HH:mm"), 
        EndTime = breakItem.EndTime.ToString("HH:mm"), 
        breakItem.Description, 
        breakItem.IsRecurring,
        SpecificDate = breakItem.SpecificDate?.ToString("yyyy-MM-dd")
    });
});

specialists.MapDelete("/my-breaks/{id:guid}", (Guid id, HttpContext context, GlowBookDbContext dbContext, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var breakItem = dbContext.SpecialistBreaks.FirstOrDefault(b => b.Id == id && b.SpecialistId == userId.Value);
    if (breakItem == null) return Results.NotFound();

    dbContext.SpecialistBreaks.Remove(breakItem);
    dbContext.SaveChanges();

    return Results.NoContent();
});

// Bookings endpoints - Protected
var bookings = app.MapGroup("/api/bookings").WithTags("Bookings");

bookings.MapGet("/", (HttpContext context, IBookingRepository repository, IAuthService authService, ILogger<Program> logger) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var results = repository.GetAllByUser(userId.Value);
    logger.LogInformation("GET /api/bookings for userId {UserId} returned {Count} bookings", userId.Value, results.Count);
    return Results.Ok(results);
});

bookings.MapGet("/specialist/{specialistId:guid}/date/{date}", 
    (Guid specialistId, DateTime date, IBookingRepository repository) =>
{
    var results = repository.GetBySpecialist(specialistId, date);
    return Results.Ok(results);
});

bookings.MapPost("/", (CreateBookingRequest request, HttpContext context, IBookingRepository repository, 
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    // Validate specialist exists (user with IsSpecialist = true)
    var specialist = userRepo.GetById(request.SpecialistId);
    if (specialist == null || !specialist.IsSpecialist) 
        return Results.BadRequest(new { message = "Specialist not found." });

    // Parse times
    if (!TimeSpan.TryParse(request.StartTime, out var startTime) ||
        !TimeSpan.TryParse(request.EndTime, out var endTime))
    {
        return Results.BadRequest(new { message = "Invalid time format." });
    }

    // Check for conflicts
    var existingBookings = repository.GetBySpecialist(request.SpecialistId, request.BookingDate);
    var hasConflict = existingBookings.Any(b => 
        (startTime >= b.StartTime && startTime < b.EndTime) ||
        (endTime > b.StartTime && endTime <= b.EndTime) ||
        (startTime <= b.StartTime && endTime >= b.EndTime));

    if (hasConflict)
    {
        return Results.BadRequest(new { message = "This time slot is already booked." });
    }

    var booking = repository.Add(userId.Value, request.SpecialistId, request.BookingDate, 
        startTime, endTime, request.Service, request.Notes);
    
    return Results.Created($"/api/bookings/{booking.Id}", booking);
});

bookings.MapDelete("/{id:guid}", (Guid id, HttpContext context, IBookingRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var cancelled = repository.Cancel(id, userId.Value);
    return cancelled ? Results.NoContent() : Results.NotFound();
});

// Services endpoints - Public (read) and Admin (write)
var services = app.MapGroup("/api/services").WithTags("Services");

services.MapGet("/", (IServiceRepository repository, string? category, GlowBookDbContext dbContext) =>
{
    // Get all services with specialist information
    List<ServiceResponse> allServices;
    
    if (repository is EfServiceRepository efRepo)
    {
        allServices = efRepo.GetAllWithSpecialistInfo();
    }
    else
    {
        // Fallback for in-memory repository
        allServices = repository.GetAll().Select(s => new ServiceResponse
        {
            Id = s.Id,
            Name = s.Name,
            Category = s.Category,
            DurationMinutes = s.DurationMinutes,
            Price = s.Price,
            Description = s.Description,
            SpecialistId = s.SpecialistId,
            SpecialistDisplayName = null,
            CreatedByUserId = s.CreatedByUserId,
            CreatedByDisplayName = null,
            CreatedAt = s.CreatedAt
        }).ToList();
    }
    
    // Filter by category if provided
    var results = string.IsNullOrWhiteSpace(category)
        ? allServices
        : allServices.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
    
    return Results.Ok(results);
});

services.MapGet("/{id:guid}", (Guid id, IServiceRepository repository) =>
{
    ServiceResponse? service;
    
    if (repository is EfServiceRepository efRepo)
    {
        service = efRepo.GetByIdWithSpecialistInfo(id);
    }
    else
    {
        // Fallback for in-memory repository
        var s = repository.GetById(id);
        service = s != null ? new ServiceResponse
        {
            Id = s.Id,
            Name = s.Name,
            Category = s.Category,
            DurationMinutes = s.DurationMinutes,
            Price = s.Price,
            Description = s.Description,
            SpecialistId = s.SpecialistId,
            SpecialistDisplayName = null,
            CreatedByUserId = s.CreatedByUserId,
            CreatedByDisplayName = null,
            CreatedAt = s.CreatedAt
        } : null;
    }
    
    return service is null ? Results.NotFound() : Results.Ok(service);
});

// Get services for a specific specialist
services.MapGet("/by-specialist/{specialistId:guid}", (Guid specialistId, IServiceRepository repository, string? category, GlowBookDbContext dbContext) =>
{
    List<ServiceResponse> specialistServices;
    
    if (repository is EfServiceRepository efRepo)
    {
        specialistServices = efRepo.GetAllWithSpecialistInfo()
            .Where(s => s.SpecialistId == specialistId || s.SpecialistId == null)
            .ToList();
    }
    else
    {
        specialistServices = repository.GetBySpecialist(specialistId)
            .Select(s => new ServiceResponse
            {
                Id = s.Id,
                Name = s.Name,
                Category = s.Category,
                DurationMinutes = s.DurationMinutes,
                Price = s.Price,
                Description = s.Description,
                SpecialistId = s.SpecialistId,
                SpecialistDisplayName = null,
                CreatedByUserId = s.CreatedByUserId,
                CreatedByDisplayName = null,
                CreatedAt = s.CreatedAt
            })
            .ToList();
    }
    
    var results = string.IsNullOrWhiteSpace(category)
        ? specialistServices
        : specialistServices.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
    
    return Results.Ok(results);
});

// Admin-only endpoints
services.MapPost("/", (CreateServiceRequest request, HttpContext context, IServiceRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });
    
    if (request.DurationMinutes <= 0)
        return Results.BadRequest(new { message = "Duration must be greater than 0." });

    var service = repository.Add(request.Name, request.Category, request.DurationMinutes, request.Price, request.Description, null, userId.Value);
    return Results.Created($"/api/services/{service.Id}", service);
});

services.MapPut("/{id:guid}", (Guid id, UpdateServiceRequest request, HttpContext context, IServiceRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });

    var updated = repository.Update(id, request.Name, request.Category, request.DurationMinutes, request.Price, request.Description);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

services.MapDelete("/{id:guid}", (Guid id, HttpContext context, IServiceRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Specialist service management endpoints
services.MapGet("/my-services", (HttpContext context, IServiceRepository serviceRepo, IUserRepository userRepo, IAuthService authService, GlowBookDbContext dbContext) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    // Get services for this specialist (userId is now the specialistId since they're merged)
    List<ServiceResponse> myServices;
    if (serviceRepo is EfServiceRepository efRepo)
    {
        myServices = efRepo.GetAllWithSpecialistInfo()
            .Where(s => s.SpecialistId == userId.Value)
            .ToList();
    }
    else
    {
        myServices = serviceRepo.GetBySpecialist(userId.Value)
            .Select(s => new ServiceResponse
            {
                Id = s.Id,
                Name = s.Name,
                Category = s.Category,
                DurationMinutes = s.DurationMinutes,
                Price = s.Price,
                Description = s.Description,
                SpecialistId = s.SpecialistId,
                SpecialistDisplayName = user.DisplayName ?? user.Name ?? user.Username,
                CreatedByUserId = s.CreatedByUserId,
                CreatedByDisplayName = null, // Would need to query if not using EF
                CreatedAt = s.CreatedAt
            })
            .ToList();
    }
    
    return Results.Ok(myServices);
});

services.MapPost("/my-services", (CreateServiceRequest request, HttpContext context, IServiceRepository serviceRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });
    
    if (request.DurationMinutes <= 0)
        return Results.BadRequest(new { message = "Duration must be greater than 0." });

    // Check for duplicate service name for this specialist
    var existingServices = serviceRepo.GetBySpecialist(userId.Value);
    if (existingServices.Any(s => s.Name.Equals(request.Name, StringComparison.OrdinalIgnoreCase) && s.SpecialistId == userId.Value))
        return Results.BadRequest(new { message = "You already have a service with this name." });

    // Create service linked to this specialist (userId is now the specialistId)
    // CreatedByUserId is also userId (the specialist creating their own service)
    var service = serviceRepo.Add(request.Name, request.Category, request.DurationMinutes, request.Price, request.Description, userId.Value, userId.Value);
    
    // Return service with full information including display names
    if (serviceRepo is EfServiceRepository efRepo)
    {
        var serviceResponse = efRepo.GetByIdWithSpecialistInfo(service.Id);
        return Results.Created($"/api/services/{service.Id}", serviceResponse);
    }
    
    return Results.Created($"/api/services/{service.Id}", service);
});

services.MapPut("/my-services/{id:guid}", (Guid id, UpdateServiceRequest request, HttpContext context, IServiceRepository serviceRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var service = serviceRepo.GetById(id);
    if (service == null) return Results.NotFound();
    if (service.SpecialistId != userId.Value) return Results.Json(new { message = "You can only update your own services." }, statusCode: 403);

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });

    var updated = serviceRepo.Update(id, request.Name, request.Category, request.DurationMinutes, request.Price, request.Description, userId.Value);
    
    // Return service with full information including display names
    if (serviceRepo is EfServiceRepository efRepo && updated != null)
    {
        var serviceResponse = efRepo.GetByIdWithSpecialistInfo(updated.Id);
        return Results.Ok(serviceResponse);
    }
    
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

services.MapDelete("/my-services/{id:guid}", (Guid id, HttpContext context, IServiceRepository serviceRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var service = serviceRepo.GetById(id);
    if (service == null) return Results.NotFound();
    if (service.SpecialistId != userId.Value) return Results.Json(new { message = "You can only delete your own services." }, statusCode: 403);

    var deleted = serviceRepo.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Clients endpoints - Admin only
var clients = app.MapGroup("/api/clients").WithTags("Clients");

clients.MapGet("/", (HttpContext context, IClientRepository repository, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var results = repository.GetAll();
    return Results.Ok(results);
});

clients.MapGet("/{id:guid}", (Guid id, HttpContext context, IClientRepository repository, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var client = repository.GetById(id);
    return client is null ? Results.NotFound() : Results.Ok(client);
});

clients.MapPost("/", (CreateClientRequest request, HttpContext context, IClientRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Client name is required." });
    
    if (string.IsNullOrWhiteSpace(request.Email))
        return Results.BadRequest(new { message = "Email is required." });

    if (repository.GetByEmail(request.Email) != null)
        return Results.BadRequest(new { message = "A client with this email already exists." });

    var client = repository.Add(request.Name, request.Email, request.Phone, request.Notes);
    return Results.Created($"/api/clients/{client.Id}", client);
});

clients.MapPut("/{id:guid}", (Guid id, UpdateClientRequest request, HttpContext context, IClientRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Client name is required." });

    var updated = repository.Update(id, request.Name, request.Email, request.Phone, request.Notes);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

clients.MapDelete("/{id:guid}", (Guid id, HttpContext context, IClientRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Client pricing endpoints
clients.MapGet("/{clientId:guid}/prices", (Guid clientId, HttpContext context, IClientServicePriceRepository priceRepo,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var prices = priceRepo.GetAllPricesForClient(clientId);
    return Results.Ok(prices);
});

clients.MapPost("/{clientId:guid}/prices", (Guid clientId, SetClientServicePriceRequest request, HttpContext context,
    IClientServicePriceRepository priceRepo, IClientRepository clientRepo, IServiceRepository serviceRepo,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    // Validate client and service exist
    var client = clientRepo.GetById(clientId);
    if (client == null) return Results.BadRequest(new { message = "Client not found." });

    var service = serviceRepo.GetById(request.ServiceId);
    if (service == null) return Results.BadRequest(new { message = "Service not found." });

    var price = priceRepo.SetPrice(clientId, request.ServiceId, request.CustomPrice);
    return Results.Ok(price);
});

clients.MapDelete("/{clientId:guid}/prices/{serviceId:guid}", (Guid clientId, Guid serviceId, HttpContext context,
    IClientServicePriceRepository priceRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var deleted = priceRepo.DeletePrice(clientId, serviceId);
    return deleted ? Results.NoContent() : Results.NotFound();
});

static void SeedInitialData(GlowBookDbContext context)
{
    // No data seeded - specialists and services will be created through the application
}

app.Run();

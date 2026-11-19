using EduManageLms.Api.Common;
using EduManageLms.Api.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using System.Text.RegularExpressions;

namespace EduManageLms.Tests;

public sealed class BugFixVerificationTests
{
    private static readonly Regex PhoneRegex = new(@"^(0|\+84)[0-9]{9,10}$", RegexOptions.Compiled);

    [Theory]
    [InlineData("0912345678", true)]
    [InlineData("0987654321", true)]
    [InlineData("+84912345678", true)]
    [InlineData("0834567890", true)]
    [InlineData("0912 345 678", true)]
    [InlineData("+84 912 345 678", true)]
    [InlineData("abc", false)]
    [InlineData("12345", false)]
    [InlineData("phone123", false)]
    [InlineData("abcdefghij", false)]
    [InlineData("", false)]
    public void PhoneNumberRegex_ValidatesVietnamesePhoneNumbers(string phone, bool isValid)
    {
        var normalized = phone.Trim().Replace(" ", "");
        PhoneRegex.IsMatch(normalized).Should().Be(isValid);
    }

    [Fact]
    public void ExceptionMiddleware_MapsArgumentExceptionTo400()
    {
        var ex = new ArgumentException("Tham so khong hop le");
        var (status, message) = ExceptionMiddleware.MapException(ex);

        status.Should().Be(StatusCodes.Status400BadRequest);
        message.Should().Be("Tham so khong hop le");
    }

    [Fact]
    public void ExceptionMiddleware_MapsKeyNotFoundExceptionTo404()
    {
        var ex = new KeyNotFoundException("Khong tim thay ban ghi");
        var (status, message) = ExceptionMiddleware.MapException(ex);

        status.Should().Be(StatusCodes.Status404NotFound);
        message.Should().Be("Khong tim thay ban ghi");
    }

    [Fact]
    public void ExceptionMiddleware_MapsUnauthorizedAccessExceptionTo403()
    {
        var ex = new UnauthorizedAccessException();
        var (status, message) = ExceptionMiddleware.MapException(ex);

        status.Should().Be(StatusCodes.Status403Forbidden);
        message.Should().Be("Không có quyền truy cập.");
    }

    [Fact]
    public void ExceptionMiddleware_MapsAppExceptionToItsStatusCode()
    {
        var ex = new ConflictException("Xung dot du lieu");
        var (status, message) = ExceptionMiddleware.MapException(ex);

        status.Should().Be(StatusCodes.Status409Conflict);
        message.Should().Be("Xung dot du lieu");
    }
}

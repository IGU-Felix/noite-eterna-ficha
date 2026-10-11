using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

internal static class Program
{
    private const string ProjectUrl =
        "https://codeload.github.com/IGU-Felix/noite-eterna-ficha/zip/refs/heads/main";

    [STAThread]
    private static void Main()
    {
        var executableName = Path.GetFileNameWithoutExtension(Environment.ProcessPath ?? "");
        if (executableName.Equals("Noite-Eterna", StringComparison.OrdinalIgnoreCase))
        {
            LaunchApplication();
            return;
        }
        if (executableName.Equals("Desinstalar-Noite-Eterna", StringComparison.OrdinalIgnoreCase))
        {
            UninstallApplication();
            return;
        }
        MainAsync().GetAwaiter().GetResult();
    }

    private static async Task MainAsync()
    {
        string installDirectory = string.Empty;
        var temporaryDirectory = Path.Combine(
            Path.GetTempPath(), "noite-eterna-install-" + Guid.NewGuid().ToString("N"));

        try
        {
            using var folderDialog = new FolderBrowserDialog
            {
                Description = "Escolha onde os arquivos da Ficha Noite Eterna serão instalados.",
                UseDescriptionForTitle = true,
                SelectedPath = Environment.GetFolderPath(
                    Environment.SpecialFolder.LocalApplicationData),
                ShowNewFolderButton = true
            };

            if (folderDialog.ShowDialog() != DialogResult.OK)
                return;

            installDirectory = Path.Combine(folderDialog.SelectedPath, "Noite-Eterna-Ficha");
            Directory.CreateDirectory(temporaryDirectory);
            SetStatus($"Baixando os arquivos da ficha para:\n{installDirectory}");

            var archivePath = Path.Combine(temporaryDirectory, "project.zip");
            var extractDirectory = Path.Combine(temporaryDirectory, "extracted");
            using var client = new HttpClient { Timeout = TimeSpan.FromMinutes(10) };
            client.DefaultRequestHeaders.CacheControl =
                new System.Net.Http.Headers.CacheControlHeaderValue { NoCache = true };
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Noite-Eterna-Instalador/2.0");
            var downloadUrl = ProjectUrl + "?download=" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            using var response = await client.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();
            await using (var source = await response.Content.ReadAsStreamAsync())
            await using (var destination = File.Create(archivePath))
                await source.CopyToAsync(destination);

            ZipFile.ExtractToDirectory(archivePath, extractDirectory);
            var projectDirectory = Directory.GetDirectories(extractDirectory).FirstOrDefault(path =>
                File.Exists(Path.Combine(path, "package.json")) &&
                File.Exists(Path.Combine(path, "package-lock.json")) &&
                Directory.Exists(Path.Combine(path, "src")) &&
                Directory.Exists(Path.Combine(path, "public")) &&
                File.Exists(Path.Combine(path, "bot-desktop", "requirements.txt")));
            if (projectDirectory is null)
                throw new InvalidOperationException(
                    "O pacote baixado não contém a estrutura completa da ficha " +
                    "(package.json, package-lock.json, src, public e bot-desktop).");

            var fichaDirectory = Path.Combine(installDirectory, "noite-eterna-ficha");
            var auxiliaryDirectory = Path.Combine(installDirectory, "app-auxiliar");
            RemoveLegacyInstallation(installDirectory, fichaDirectory, auxiliaryDirectory);
            if (Directory.Exists(fichaDirectory))
                Directory.Delete(fichaDirectory, true);
            if (Directory.Exists(auxiliaryDirectory))
                Directory.Delete(auxiliaryDirectory, true);
            Directory.CreateDirectory(Path.Combine(auxiliaryDirectory, "logs"));
            Directory.CreateDirectory(Path.Combine(auxiliaryDirectory, "cache"));
            CopyDirectory(projectDirectory, fichaDirectory);
            MoveDirectory(Path.Combine(fichaDirectory, "bot-desktop"),
                Path.Combine(auxiliaryDirectory, "bot-desktop"));
            await InstallDependencies(fichaDirectory, auxiliaryDirectory);
            CreateEnvironmentFile(auxiliaryDirectory);
            InstallLaunchers(installDirectory, auxiliaryDirectory);
            CreateShortcut(installDirectory);

            MessageBox.Show(
                $"Instalação concluída.\n\nArquivos instalados em:\n{installDirectory}",
                "Noite Eterna", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception error)
        {
            MessageBox.Show(
                $"Erro durante a instalação:\n\n{error.Message}",
                "Noite Eterna", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Environment.ExitCode = 1;
        }
        finally
        {
            try
            {
                if (Directory.Exists(temporaryDirectory))
                    Directory.Delete(temporaryDirectory, true);
            }
            catch { }
        }
    }

    private static async Task InstallDependencies(string fichaDirectory, string auxiliaryDirectory)
    {
        RequireCommand("winget", "App Installer/winget");
        await EnsurePython();
        await EnsurePackage("OpenJS.NodeJS.LTS", "node");
        await EnsurePackage("yt-dlp.FFmpeg", "ffmpeg");
        await EnsurePackage("Cloudflare.cloudflared", "cloudflared");
        RefreshPath();

        var pythonLauncher = FindCommand("py") ?? throw new InvalidOperationException(
            "Python foi instalado, mas o inicializador 'py' não foi encontrado. Reinicie o computador e tente novamente.");
        var bot = Path.Combine(auxiliaryDirectory, "bot-desktop");
        var venv = Path.Combine(bot, ".venv");
        await Run(pythonLauncher, "-3.14 -m venv \"" + venv + "\"", showWindow: true);
        var python = Path.Combine(venv, "Scripts", "python.exe");
        await Run(python, "-m pip install --upgrade pip", showWindow: true);
        await Run(python, $"-m pip install -r \"{Path.Combine(bot, "requirements.txt")}\"", showWindow: true);
        await Run("npm.cmd", "ci", fichaDirectory, showWindow: true);
        await Run("npm.cmd", "run build", fichaDirectory, showWindow: true);
    }

    private static async Task EnsurePackage(string packageId, string command)
    {
        RefreshPath();
        if (FindCommand(command) is not null)
        {
            return;
        }

        var exitCode = await RunCode(
            "winget",
            $"install --id {packageId} --exact --source winget --accept-source-agreements --accept-package-agreements",
            showWindow: true);
        RefreshPath();
        if (FindCommand(command) is null)
        {
            throw new InvalidOperationException(
                $"Não foi possível instalar {packageId}. " +
                $"O winget terminou com código {exitCode}. " +
                "Abra a Microsoft Store, atualize o App Installer e tente novamente.");
        }
    }

    private static async Task EnsurePython()
    {
        RefreshPath();
        var launcher = FindCommand("py");
        if (launcher is not null && await RunCode(launcher, "-3.14 -c \"import sys\"") == 0)
        {
            return;
        }

        var exitCode = await RunCode(
            "winget",
            "install --id Python.Python.3.14 --exact --source winget --accept-source-agreements --accept-package-agreements",
            showWindow: true);
        RefreshPath();
        launcher = FindCommand("py");
        if (launcher is null || await RunCode(launcher, "-3.14 -c \"import sys\"") != 0)
        {
            throw new InvalidOperationException(
                $"Não foi possível instalar Python 3.14. O winget terminou com código {exitCode}. " +
                "Abra a Microsoft Store, atualize o App Installer e tente novamente.");
        }
    }

    private static async Task Run(string file, string arguments, string workingDirectory = "", bool showWindow = false)
    {
        var exitCode = await RunCode(file, arguments, workingDirectory, showWindow);
        if (exitCode != 0)
            throw new InvalidOperationException($"{file} terminou com código {exitCode}.");
    }

    private static async Task<int> RunCode(
        string file,
        string arguments,
        string workingDirectory = "",
        bool showWindow = false)
    {
        var process = Process.Start(new ProcessStartInfo
        {
            FileName = file,
            Arguments = arguments,
            WorkingDirectory = string.IsNullOrEmpty(workingDirectory) ? Environment.CurrentDirectory : workingDirectory,
            UseShellExecute = showWindow,
            CreateNoWindow = !showWindow
        }) ?? throw new InvalidOperationException($"Não foi possível iniciar {file}.");
        await process.WaitForExitAsync();
        return process.ExitCode;
    }

    private static void RequireCommand(string name, string label)
    {
        if (FindCommand(name) is null)
            throw new InvalidOperationException($"{label} não foi encontrado neste computador.");
    }

    private static string FindCommand(string name)
    {
        var paths = (Environment.GetEnvironmentVariable("Path") ?? "")
            .Split(';', StringSplitOptions.RemoveEmptyEntries);
        foreach (var directory in paths)
        {
            var candidate = Path.Combine(directory, name);
            if (File.Exists(candidate)) return candidate;
            if (File.Exists(candidate + ".exe")) return candidate + ".exe";
            if (File.Exists(candidate + ".cmd")) return candidate + ".cmd";
        }
        return null;
    }

    private static void RefreshPath()
    {
        var machine = Environment.GetEnvironmentVariable("Path", EnvironmentVariableTarget.Machine) ?? "";
        var user = Environment.GetEnvironmentVariable("Path", EnvironmentVariableTarget.User) ?? "";
        Environment.SetEnvironmentVariable("Path", machine + ";" + user);
    }

    private static void CreateEnvironmentFile(string root)
    {
        var bot = Path.Combine(root, "bot-desktop");
        var target = Path.Combine(bot, ".env");
        if (File.Exists(target)) return;
        var example = Path.Combine(bot, ".env.example");
        var content = File.ReadAllText(example);
        var bytes = RandomNumberGenerator.GetBytes(32);
        var key = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        content = content.Replace("DISCORD_API_KEY=", "DISCORD_API_KEY=" + key);
        File.WriteAllText(target, content, Encoding.UTF8);
    }

    private static void InstallLaunchers(string root, string auxiliaryDirectory)
    {
        var currentExecutable = Environment.ProcessPath
            ?? throw new InvalidOperationException("Não foi possível localizar o instalador.");
        File.Copy(currentExecutable, Path.Combine(root, "Noite-Eterna.exe"), true);
        File.Copy(currentExecutable, Path.Combine(root, "Desinstalar-Noite-Eterna.exe"), true);
        var sourceIcon = Path.Combine(auxiliaryDirectory, "bot-desktop", "icons", "Moon_Yellow.ico");
        if (File.Exists(sourceIcon))
            File.Copy(sourceIcon, Path.Combine(root, "Noite-Eterna.ico"), true);
    }

    private static void CreateShortcut(string root)
    {
        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var shortcutPath = Path.Combine(desktop, "Noite Eterna Bot.lnk");
        var shellType = Type.GetTypeFromProgID("WScript.Shell")
            ?? throw new InvalidOperationException("Não foi possível criar o atalho do Windows.");
        dynamic shell = Activator.CreateInstance(shellType)!;
        dynamic shortcut = shell.CreateShortcut(shortcutPath);
        shortcut.TargetPath = Path.Combine(root, "Noite-Eterna.exe");
        shortcut.WorkingDirectory = root;
        shortcut.IconLocation = Path.Combine(root, "Noite-Eterna.ico");
        shortcut.Description = "Iniciar o bot de música do Noite Eterna";
        shortcut.Save();
    }

    private static void CopyDirectory(string source, string destination)
    {
        Directory.CreateDirectory(destination);
        foreach (var file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(source, file);
            var target = Path.Combine(destination, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Copy(file, target, true);
        }
    }

    private static void MoveDirectory(string source, string destination)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        if (Directory.Exists(destination))
            Directory.Delete(destination, true);
        Directory.Move(source, destination);
    }

    private static void RemoveLegacyInstallation(
        string root,
        string fichaDirectory,
        string auxiliaryDirectory)
    {
        var legacyMarker = Path.Combine(root, "package.json");
        if (!File.Exists(legacyMarker))
            return;

        foreach (var directory in Directory.GetDirectories(root))
        {
            if (!PathEquals(directory, fichaDirectory) &&
                !PathEquals(directory, auxiliaryDirectory))
            {
                Directory.Delete(directory, true);
            }
        }

        foreach (var file in Directory.GetFiles(root))
        {
            if (!Path.GetFileName(file).Equals(".env", StringComparison.OrdinalIgnoreCase))
                File.Delete(file);
        }
    }

    private static bool PathEquals(string left, string right) =>
        string.Equals(
            Path.GetFullPath(left).TrimEnd(Path.DirectorySeparatorChar),
            Path.GetFullPath(right).TrimEnd(Path.DirectorySeparatorChar),
            StringComparison.OrdinalIgnoreCase);

    private static void LaunchApplication()
        {
            var root = Path.GetDirectoryName(Environment.ProcessPath!)!;
            var script = Path.Combine(root, "app-auxiliar", "bot-desktop", "start.vbs");
            if (!File.Exists(script))
            {
                MessageBox.Show("A instalação está incompleta. Execute o instalador novamente.",
                    "Noite Eterna",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            Process.Start(new ProcessStartInfo
            {
                FileName = script,
                WorkingDirectory = Path.GetDirectoryName(script),
                UseShellExecute = true
            });
        }

    private static void UninstallApplication()
        {
            var root = Path.GetDirectoryName(Environment.ProcessPath!)!;
            var result = MessageBox.Show(
                $"Remover completamente o Noite Eterna de:\n{root}?",
                "Desinstalar Noite Eterna", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (result != DialogResult.Yes)
                return;
            var command = $"/c timeout /t 2 /nobreak >nul & rmdir /s /q \"{root}\"";
            Process.Start(new ProcessStartInfo("cmd.exe", command)
            {
                CreateNoWindow = true,
                UseShellExecute = false
            });
    }

    private static void SetStatus(string message)
    {
        // Mantém o instalador gráfico simples; falhas continuam sendo exibidas em uma caixa de diálogo.
    }
}

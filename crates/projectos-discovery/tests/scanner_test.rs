use std::fs;
use tempfile::tempdir;
use projectos_discovery::{ProjectScanner, ProjectType};

#[test]
fn test_scanner_detects_various_projects() {
    let root = tempdir().unwrap();
    let root_path = root.path();

    // Setup fixtures
    // 1. Rust project
    let rust_path = root_path.join("rust-app");
    fs::create_dir_all(&rust_path).unwrap();
    fs::write(rust_path.join("Cargo.toml"), "").unwrap();
    fs::create_dir_all(rust_path.join(".git")).unwrap(); // also git

    // 2. Node project
    let node_path = root_path.join("node-app");
    fs::create_dir_all(&node_path).unwrap();
    fs::write(node_path.join("package.json"), "").unwrap();
    fs::write(node_path.join("pnpm-lock.yaml"), "").unwrap();

    // 3. Python project
    let py_path = root_path.join("py-app");
    fs::create_dir_all(&py_path).unwrap();
    fs::write(py_path.join("pyproject.toml"), "").unwrap();

    // 4. Unity project
    let unity_path = root_path.join("unity-game");
    fs::create_dir_all(unity_path.join("ProjectSettings")).unwrap();
    fs::write(unity_path.join("ProjectSettings").join("ProjectVersion.txt"), "").unwrap();

    // 5. Godot project
    let godot_path = root_path.join("godot-game");
    fs::create_dir_all(&godot_path).unwrap();
    fs::write(godot_path.join("project.godot"), "").unwrap();

    // 6. .NET project
    let dotnet_path = root_path.join("dotnet-app");
    fs::create_dir_all(&dotnet_path).unwrap();
    fs::write(dotnet_path.join("app.csproj"), "").unwrap();

    // 7. Generic Git project
    let generic_path = root_path.join("docs-repo");
    fs::create_dir_all(generic_path.join(".git")).unwrap();
    fs::write(generic_path.join("README.md"), "").unwrap();

    // Run scanner
    let scanner = ProjectScanner::new();
    let candidates = scanner.scan_directory(root_path);

    // Assertions
    assert_eq!(candidates.len(), 7, "Should detect exactly 7 projects");

    let has_rust = candidates.iter().any(|c| c.project_type == ProjectType::Rust && c.source_controls.contains(&"Git".to_string()));
    assert!(has_rust, "Rust project with Git should be detected");

    let has_node = candidates.iter().any(|c| c.project_type == ProjectType::Node && c.package_managers.contains(&"pnpm".to_string()));
    assert!(has_node, "Node project with pnpm should be detected");

    let has_python = candidates.iter().any(|c| c.project_type == ProjectType::Python);
    assert!(has_python, "Python project should be detected");

    let has_unity = candidates.iter().any(|c| c.project_type == ProjectType::Unity);
    assert!(has_unity, "Unity project should be detected");

    let has_godot = candidates.iter().any(|c| c.project_type == ProjectType::Godot);
    assert!(has_godot, "Godot project should be detected");

    let has_dotnet = candidates.iter().any(|c| c.project_type == ProjectType::DotNet);
    assert!(has_dotnet, ".NET project should be detected");

    let has_generic = candidates.iter().any(|c| c.project_type == ProjectType::Generic);
    assert!(has_generic, "Generic git project should be detected");
}

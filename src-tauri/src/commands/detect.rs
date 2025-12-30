use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub frameworks: Vec<String>,
    pub languages: Vec<String>,
    pub has_tests: bool,
    pub package_manager: Option<String>,
    pub has_typescript: bool,
    pub has_eslint: bool,
    pub has_prettier: bool,
}

impl Default for ProjectInfo {
    fn default() -> Self {
        Self {
            frameworks: Vec::new(),
            languages: Vec::new(),
            has_tests: false,
            package_manager: None,
            has_typescript: false,
            has_eslint: false,
            has_prettier: false,
        }
    }
}

#[tauri::command]
pub fn detect_project_type(path: String) -> Result<ProjectInfo, String> {
    let project_path = Path::new(&path);

    if !project_path.exists() {
        return Err("Project path does not exist".to_string());
    }

    let mut info = ProjectInfo::default();

    // Check for package.json (Node.js/JavaScript)
    let package_json_path = project_path.join("package.json");
    if package_json_path.exists() {
        info.languages.push("javascript".to_string());
        info.package_manager = Some(detect_node_package_manager(project_path));

        if let Ok(content) = fs::read_to_string(&package_json_path) {
            parse_package_json(&content, &mut info);
        }
    }

    // Check for Cargo.toml (Rust)
    if project_path.join("Cargo.toml").exists() {
        info.languages.push("rust".to_string());
        info.frameworks.push("rust".to_string());
    }

    // Check for pyproject.toml or setup.py (Python)
    if project_path.join("pyproject.toml").exists() || project_path.join("setup.py").exists() {
        info.languages.push("python".to_string());

        if project_path.join("pyproject.toml").exists() {
            if let Ok(content) = fs::read_to_string(project_path.join("pyproject.toml")) {
                parse_pyproject(&content, &mut info);
            }
        }
    }

    // Check for go.mod (Go)
    if project_path.join("go.mod").exists() {
        info.languages.push("go".to_string());
    }

    // Check for tsconfig.json (TypeScript)
    if project_path.join("tsconfig.json").exists() {
        info.has_typescript = true;
        if !info.languages.contains(&"typescript".to_string()) {
            info.languages.push("typescript".to_string());
        }
    }

    // Check for .eslintrc* (ESLint)
    info.has_eslint = project_path.join(".eslintrc").exists()
        || project_path.join(".eslintrc.js").exists()
        || project_path.join(".eslintrc.json").exists()
        || project_path.join(".eslintrc.yml").exists()
        || project_path.join("eslint.config.js").exists()
        || project_path.join("eslint.config.mjs").exists();

    // Check for .prettierrc* (Prettier)
    info.has_prettier = project_path.join(".prettierrc").exists()
        || project_path.join(".prettierrc.js").exists()
        || project_path.join(".prettierrc.json").exists()
        || project_path.join("prettier.config.js").exists();

    // Check for test directories
    info.has_tests = project_path.join("tests").exists()
        || project_path.join("test").exists()
        || project_path.join("__tests__").exists()
        || project_path.join("spec").exists();

    Ok(info)
}

fn detect_node_package_manager(project_path: &Path) -> String {
    if project_path.join("pnpm-lock.yaml").exists() {
        "pnpm".to_string()
    } else if project_path.join("yarn.lock").exists() {
        "yarn".to_string()
    } else if project_path.join("bun.lockb").exists() {
        "bun".to_string()
    } else {
        "npm".to_string()
    }
}

fn parse_package_json(content: &str, info: &mut ProjectInfo) {
    #[derive(Deserialize)]
    struct PackageJson {
        dependencies: Option<std::collections::HashMap<String, String>>,
        #[serde(rename = "devDependencies")]
        dev_dependencies: Option<std::collections::HashMap<String, String>>,
    }

    if let Ok(pkg) = serde_json::from_str::<PackageJson>(content) {
        let all_deps: Vec<&String> = pkg
            .dependencies
            .iter()
            .chain(pkg.dev_dependencies.iter())
            .flat_map(|deps| deps.keys())
            .collect();

        // Detect frameworks
        for dep in &all_deps {
            let dep_lower = dep.to_lowercase();

            // React
            if dep_lower == "react" || dep_lower == "react-dom" {
                if !info.frameworks.contains(&"react".to_string()) {
                    info.frameworks.push("react".to_string());
                }
            }

            // Next.js
            if dep_lower == "next" {
                if !info.frameworks.contains(&"nextjs".to_string()) {
                    info.frameworks.push("nextjs".to_string());
                }
            }

            // Vue
            if dep_lower == "vue" {
                if !info.frameworks.contains(&"vue".to_string()) {
                    info.frameworks.push("vue".to_string());
                }
            }

            // Svelte
            if dep_lower == "svelte" {
                if !info.frameworks.contains(&"svelte".to_string()) {
                    info.frameworks.push("svelte".to_string());
                }
            }

            // Angular
            if dep_lower == "@angular/core" {
                if !info.frameworks.contains(&"angular".to_string()) {
                    info.frameworks.push("angular".to_string());
                }
            }

            // Express
            if dep_lower == "express" {
                if !info.frameworks.contains(&"express".to_string()) {
                    info.frameworks.push("express".to_string());
                }
            }

            // Tailwind
            if dep_lower == "tailwindcss" {
                if !info.frameworks.contains(&"tailwind".to_string()) {
                    info.frameworks.push("tailwind".to_string());
                }
            }

            // TypeScript
            if dep_lower == "typescript" {
                info.has_typescript = true;
                if !info.languages.contains(&"typescript".to_string()) {
                    info.languages.push("typescript".to_string());
                }
            }

            // ESLint
            if dep_lower == "eslint" {
                info.has_eslint = true;
            }

            // Prettier
            if dep_lower == "prettier" {
                info.has_prettier = true;
            }

            // Testing frameworks
            if dep_lower == "jest"
                || dep_lower == "vitest"
                || dep_lower == "mocha"
                || dep_lower == "@testing-library/react"
                || dep_lower == "playwright"
                || dep_lower == "cypress"
            {
                info.has_tests = true;
            }
        }
    }
}

fn parse_pyproject(content: &str, info: &mut ProjectInfo) {
    // Simple detection for common Python frameworks
    let content_lower = content.to_lowercase();

    if content_lower.contains("django") {
        info.frameworks.push("django".to_string());
    }
    if content_lower.contains("flask") {
        info.frameworks.push("flask".to_string());
    }
    if content_lower.contains("fastapi") {
        info.frameworks.push("fastapi".to_string());
    }
    if content_lower.contains("pytest") {
        info.has_tests = true;
    }
}

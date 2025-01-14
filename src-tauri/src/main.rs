#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

fn main() {
    // Obtenha o nome do aplicativo e a versão
    let app_name = "DoGoCode";
    let app_version = env!("CARGO_PKG_VERSION"); // Obtém a versão do Cargo.toml

    // Crie o título com nome e versão
    let window_title = format!("{} v{}", app_name, app_version);

    tauri::Builder::default()
        .setup(move |app| {
            // Configura o título ao criar a janela principal
            let main_window = app.get_window("main").unwrap();
            main_window.set_title(&window_title).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erro ao rodar o Tauri");
}

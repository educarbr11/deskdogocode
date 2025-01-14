use tauri::{Manager, WindowBuilder, WindowUrl};
use tauri_plugin_updater::UpdaterExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build()) // Adiciona o plugin de atualização
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = update(handle).await {
                    eprintln!("Erro ao atualizar: {}", e);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap();
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let window = WindowBuilder::new(
            &app,
            "update_window",
            WindowUrl::App("update.html".into()),
        )
        .title("Atualização Disponível")
        .inner_size(400.0, 300.0)
        .resizable(false)
        .always_on_top(true)
        .build()?;

        let mut downloaded = 0;

        // Realiza o download e instala a atualização
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    // Atualiza o progresso no frontend
                    window.emit("download-progress", (downloaded, content_length)).unwrap();
                },
                || {
                    println!("Download concluído!");
                },
            )
            .await?;

        println!("Atualização instalada!");
        app.restart();
    }

    Ok(())
}

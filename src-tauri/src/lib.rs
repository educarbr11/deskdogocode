use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_updater::UpdaterExt;
use std::time::Duration;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn check_for_updates_manual<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    check_for_updates(app).await
}

async fn check_for_updates<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    println!("Verificando atualizações...");
    
    match app.updater() {
        Some(updater) => {
            match updater.check().await {
                Ok(Some(update)) => {
                    println!("Nova versão disponível: {}", update.version);
                    
                    // Notificar o frontend se necessário
                    let _ = app.emit("update-available", &update.version);
                    
                    // Baixar e instalar automaticamente
                    match update.download_and_install(|chunk_length, content_length| {
                        println!("Downloaded {} of {:?}", chunk_length, content_length);
                    }, || {
                        println!("Download finalizado, instalando...");
                    }).await {
                        Ok(_) => {
                            println!("Atualização instalada com sucesso! Reiniciando...");
                            let _ = app.emit("update-installed", "Aplicação será reiniciada");
                            
                            // Esperar um pouco antes de reiniciar
                            tokio::time::sleep(Duration::from_secs(2)).await;
                            app.restart();
                            
                            Ok("Atualização instalada com sucesso".to_string())
                        }
                        Err(e) => {
                            let error_msg = format!("Erro ao instalar atualização: {}", e);
                            println!("{}", error_msg);
                            let _ = app.emit("update-error", &error_msg);
                            Err(error_msg)
                        }
                    }
                }
                Ok(None) => {
                    println!("Aplicação já está atualizada");
                    let _ = app.emit("update-not-available", "Aplicação já está atualizada");
                    Ok("Aplicação já está atualizada".to_string())
                }
                Err(e) => {
                    let error_msg = format!("Erro ao verificar atualizações: {}", e);
                    println!("{}", error_msg);
                    let _ = app.emit("update-error", &error_msg);
                    Err(error_msg)
                }
            }
        }
        None => {
            let error_msg = "Updater não disponível".to_string();
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

async fn setup_auto_updater<R: Runtime>(app: AppHandle<R>) {
    // Verificar imediatamente na inicialização
    tokio::time::sleep(Duration::from_secs(10)).await; // Aguardar 10s após iniciar
    let _ = check_for_updates(app.clone()).await;
    
    // Verificar a cada 30 minutos
    let mut interval = tokio::time::interval(Duration::from_secs(30 * 60));
    loop {
        interval.tick().await;
        let _ = check_for_updates(app.clone()).await;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![greet, check_for_updates_manual])
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Iniciar o verificador automático de atualizações em background
            tokio::spawn(async move {
                setup_auto_updater(handle).await;
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tokio::fs as tokio_fs;

/**
 * 奖品颜色枚举 - 与前端保持一致
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PrizeColor {
    Red,
    Yellow,
    Blue,
}

/**
 * 奖品基础信息
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prize {
    pub id: String,
    pub name: String,
    pub color: PrizeColor,
    pub description: String,
    pub value: f64,
}

/**
 * 抽奖结果
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryResult {
    #[serde(rename = "prizeId")]
    pub prize_id: String,
    pub timestamp: i64,
    #[serde(rename = "cycleId")]
    pub cycle_id: String,
    #[serde(rename = "drawNumber")]
    pub draw_number: u32,
}

/**
 * 剩余抽奖次数
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemainingDraws {
    #[serde(rename = "red")]
    pub red: u32,
    #[serde(rename = "yellow")]
    pub yellow: u32,
    #[serde(rename = "blue")]
    pub blue: u32,
}

/**
 * 抽奖周期
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryCycle {
    pub id: String,
    #[serde(rename = "startTime")]
    pub start_time: i64,
    #[serde(rename = "endTime")]
    pub end_time: Option<i64>,
    pub results: Vec<LotteryResult>,
    pub completed: bool,
    #[serde(rename = "remainingDraws")]
    pub remaining_draws: RemainingDraws,
}

/**
 * 抽奖系统配置
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryConfig {
    #[serde(rename = "drawsPerCycle")]
    pub draws_per_cycle: u32,
    #[serde(rename = "drawsPerColor")]
    pub draws_per_color: u32,
}

/**
 * 抽奖系统整体状态
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryState {
    #[serde(rename = "currentCycle")]
    pub current_cycle: LotteryCycle,
    pub history: Vec<LotteryCycle>,
    #[serde(rename = "availablePrizes")]
    pub available_prizes: Vec<Prize>,
    pub config: LotteryConfig,
}

/**
 * 获取数据存储路径
 */
fn get_data_path() -> Result<PathBuf, String> {
    let documents_dir = dirs::document_dir()
        .ok_or("无法获取用户文档目录")?;

    let lottery_dir = documents_dir.join("lottery-game");

    // 确保目录存在
    if !lottery_dir.exists() {
        fs::create_dir_all(&lottery_dir)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }

    Ok(lottery_dir.join("data.json"))
}

/**
 * 获取备份路径
 */
fn get_backup_path() -> Result<PathBuf, String> {
    let documents_dir = dirs::document_dir()
        .ok_or("无法获取用户文档目录")?;

    let lottery_dir = documents_dir.join("lottery-game");
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");

    Ok(lottery_dir.join(format!("data_backup_{}.json", timestamp)))
}

/**
 * 保存抽奖数据
 */
#[tauri::command]
pub async fn save_lottery_data(data: LotteryState) -> Result<(), String> {
    let data_path = get_data_path()?;

    // 序列化数据
    let json_data = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("数据序列化失败: {}", e))?;

    // 异步写入文件
    tokio_fs::write(&data_path, json_data)
        .await
        .map_err(|e| format!("写入文件失败: {}", e))?;

    log::info!("抽奖数据已保存到: {:?}", data_path);
    Ok(())
}

/**
 * 加载抽奖数据
 */
#[tauri::command]
pub async fn load_lottery_data() -> Result<LotteryState, String> {
    let data_path = get_data_path()?;

    // 检查文件是否存在
    if !data_path.exists() {
        log::info!("数据文件不存在，返回默认状态");
        return Ok(create_default_state());
    }

    // 异步读取文件
    let json_data = tokio_fs::read_to_string(&data_path)
        .await
        .map_err(|e| format!("读取文件失败: {}", e))?;

    // 反序列化数据
    let lottery_state: LotteryState = serde_json::from_str(&json_data)
        .map_err(|e| {
            log::error!("数据反序列化失败: {}", e);
            format!("数据格式错误，可能已损坏: {}", e)
        })?;

    log::info!("抽奖数据已加载从: {:?}", data_path);
    Ok(lottery_state)
}

/**
 * 备份数据
 */
#[tauri::command]
pub async fn backup_data() -> Result<String, String> {
    let data_path = get_data_path()?;
    let backup_path = get_backup_path()?;

    // 检查原始数据文件是否存在
    if !data_path.exists() {
        return Err("没有找到数据文件，无法备份".to_string());
    }

    // 复制文件到备份位置
    tokio_fs::copy(&data_path, &backup_path)
        .await
        .map_err(|e| format!("备份失败: {}", e))?;

    let backup_path_str = backup_path.to_string_lossy().to_string();
    log::info!("数据已备份到: {}", backup_path_str);

    Ok(backup_path_str)
}

/**
 * 从备份恢复数据
 */
#[tauri::command]
pub async fn restore_from_backup(backup_path: String) -> Result<(), String> {
    let backup_path = PathBuf::from(backup_path);
    let data_path = get_data_path()?;

    // 检查备份文件是否存在
    if !backup_path.exists() {
        return Err("备份文件不存在".to_string());
    }

    // 验证备份文件格式
    let backup_data = tokio_fs::read_to_string(&backup_path)
        .await
        .map_err(|e| format!("读取备份文件失败: {}", e))?;

    let _: LotteryState = serde_json::from_str(&backup_data)
        .map_err(|e| format!("备份文件格式错误: {}", e))?;

    // 复制备份文件到数据位置
    tokio_fs::copy(&backup_path, &data_path)
        .await
        .map_err(|e| format!("恢复失败: {}", e))?;

    log::info!("数据已从备份恢复: {:?}", backup_path);
    Ok(())
}

/**
 * 验证数据完整性
 */
#[tauri::command]
pub async fn validate_data() -> Result<bool, String> {
    let data_path = get_data_path()?;

    // 如果文件不存在，认为是有效的（将创建默认状态）
    if !data_path.exists() {
        return Ok(true);
    }

    // 尝试读取和解析数据
    match tokio_fs::read_to_string(&data_path).await {
        Ok(json_data) => {
            match serde_json::from_str::<LotteryState>(&json_data) {
                Ok(state) => {
                    // 进一步验证数据逻辑
                    validate_lottery_state(&state)
                }
                Err(_) => Ok(false)
            }
        }
        Err(_) => Ok(false)
    }
}

/**
 * 创建默认抽奖状态
 */
fn create_default_state() -> LotteryState {
    let now = chrono::Utc::now().timestamp_millis();

    LotteryState {
        current_cycle: LotteryCycle {
            id: format!("cycle_{}_{}", now, uuid::Uuid::new_v4().simple()),
            start_time: now,
            end_time: None,
            results: Vec::new(),
            completed: false,
            remaining_draws: RemainingDraws {
                red: 2,
                yellow: 2,
                blue: 2,
            },
        },
        history: Vec::new(),
        available_prizes: create_default_prizes(),
        config: LotteryConfig {
            draws_per_cycle: 6,
            draws_per_color: 2,
        },
    }
}

/**
 * 创建默认奖品列表
 */
fn create_default_prizes() -> Vec<Prize> {
    vec![
        Prize {
            id: "prize_red_1".to_string(),
            name: "红色奖品1".to_string(),
            color: PrizeColor::Red,
            description: "精美红色礼品，价值不菲".to_string(),
            value: 100.0,
        },
        Prize {
            id: "prize_red_2".to_string(),
            name: "红色奖品2".to_string(),
            color: PrizeColor::Red,
            description: "限量版红色纪念品".to_string(),
            value: 120.0,
        },
        Prize {
            id: "prize_yellow_1".to_string(),
            name: "黄色奖品1".to_string(),
            color: PrizeColor::Yellow,
            description: "经典黄色收藏品".to_string(),
            value: 80.0,
        },
        Prize {
            id: "prize_yellow_2".to_string(),
            name: "黄色奖品2".to_string(),
            color: PrizeColor::Yellow,
            description: "温馨黄色生活用品".to_string(),
            value: 90.0,
        },
        Prize {
            id: "prize_blue_1".to_string(),
            name: "蓝色奖品1".to_string(),
            color: PrizeColor::Blue,
            description: "清爽蓝色健康产品".to_string(),
            value: 70.0,
        },
        Prize {
            id: "prize_blue_2".to_string(),
            name: "蓝色奖品2".to_string(),
            color: PrizeColor::Blue,
            description: "优雅蓝色装饰品".to_string(),
            value: 85.0,
        },
    ]
}

/**
 * 验证抽奖状态的逻辑完整性
 */
fn validate_lottery_state(state: &LotteryState) -> Result<bool, String> {
    // 验证配置
    if state.config.draws_per_cycle == 0
        || state.config.draws_per_color == 0
        || state.config.draws_per_cycle != state.config.draws_per_color * 3 {
        return Ok(false);
    }

    // 验证当前周期
    let cycle = &state.current_cycle;
    let total_remaining = cycle.remaining_draws.red
        + cycle.remaining_draws.yellow
        + cycle.remaining_draws.blue;
    let completed_draws = cycle.results.len() as u32;

    if total_remaining + completed_draws != state.config.draws_per_cycle {
        return Ok(false);
    }

    // 验证奖品列表
    if state.available_prizes.is_empty() {
        return Ok(false);
    }

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::env;

    /// 设置测试环境
    fn setup_test_env() -> TempDir {
        let temp_dir = TempDir::new().expect("创建临时目录失败");
        env::set_var("HOME", temp_dir.path().to_str().unwrap());
        temp_dir
    }

    #[tokio::test]
    async fn test_save_and_load_data() {
        let _temp_dir = setup_test_env();

        // 创建测试数据
        let test_data = create_default_state();

        // 保存数据
        let save_result = save_lottery_data(test_data.clone()).await;
        assert!(save_result.is_ok(), "保存数据应该成功");

        // 加载数据
        let load_result = load_lottery_data().await;
        assert!(load_result.is_ok(), "加载数据应该成功");

        let loaded_data = load_result.unwrap();

        // 验证数据完整性
        assert_eq!(loaded_data.config.draws_per_cycle, test_data.config.draws_per_cycle);
        assert_eq!(loaded_data.config.draws_per_color, test_data.config.draws_per_color);
        assert_eq!(loaded_data.available_prizes.len(), test_data.available_prizes.len());
        assert_eq!(loaded_data.current_cycle.remaining_draws.red, test_data.current_cycle.remaining_draws.red);
    }

    #[tokio::test]
    async fn test_backup_and_restore() {
        let _temp_dir = setup_test_env();

        // 创建并保存测试数据
        let test_data = create_default_state();
        save_lottery_data(test_data.clone()).await.expect("保存初始数据失败");

        // 创建备份
        let backup_result = backup_data().await;
        assert!(backup_result.is_ok(), "创建备份应该成功");

        let backup_path = backup_result.unwrap();
        assert!(!backup_path.is_empty(), "备份路径不应为空");

        // 修改原数据
        let mut modified_data = test_data.clone();
        modified_data.config.draws_per_cycle = 9; // 修改配置
        modified_data.config.draws_per_color = 3;
        save_lottery_data(modified_data).await.expect("保存修改后数据失败");

        // 从备份恢复
        let restore_result = restore_from_backup(backup_path).await;
        assert!(restore_result.is_ok(), "从备份恢复应该成功");

        // 验证恢复后的数据
        let restored_data = load_lottery_data().await.expect("加载恢复后数据失败");
        assert_eq!(restored_data.config.draws_per_cycle, test_data.config.draws_per_cycle);
        assert_eq!(restored_data.config.draws_per_color, test_data.config.draws_per_color);
    }

    #[tokio::test]
    async fn test_data_validation() {
        let _temp_dir = setup_test_env();

        // 测试无数据文件的情况
        let validation_result = validate_data().await;
        assert!(validation_result.is_ok(), "验证无数据文件应该成功");
        assert!(validation_result.unwrap(), "无数据文件应该被认为是有效的");

        // 创建有效数据
        let test_data = create_default_state();
        save_lottery_data(test_data).await.expect("保存测试数据失败");

        // 验证有效数据
        let validation_result = validate_data().await;
        assert!(validation_result.is_ok(), "验证有效数据应该成功");
        assert!(validation_result.unwrap(), "有效数据应该通过验证");
    }

    #[tokio::test]
    async fn test_data_serialization() {
        // 测试数据序列化和反序列化
        let test_data = create_default_state();

        // 序列化
        let json_result = serde_json::to_string(&test_data);
        assert!(json_result.is_ok(), "数据序列化应该成功");

        let json_data = json_result.unwrap();
        assert!(!json_data.is_empty(), "序列化后的JSON不应为空");

        // 反序列化
        let deserialize_result: Result<LotteryState, _> = serde_json::from_str(&json_data);
        assert!(deserialize_result.is_ok(), "数据反序列化应该成功");

        let deserialized_data = deserialize_result.unwrap();

        // 验证反序列化后的数据
        assert_eq!(deserialized_data.config.draws_per_cycle, test_data.config.draws_per_cycle);
        assert_eq!(deserialized_data.available_prizes.len(), test_data.available_prizes.len());
    }

    #[tokio::test]
    async fn test_error_handling() {
        // 测试无效备份路径
        let invalid_backup_path = "/nonexistent/path/backup.json".to_string();
        let restore_result = restore_from_backup(invalid_backup_path).await;
        assert!(restore_result.is_err(), "使用无效备份路径应该失败");

        // 测试备份不存在的数据文件
        let _temp_dir = setup_test_env();
        let backup_result = backup_data().await;
        assert!(backup_result.is_err(), "备份不存在的数据文件应该失败");
    }

    #[test]
    fn test_default_state_creation() {
        let default_state = create_default_state();

        // 验证默认配置
        assert_eq!(default_state.config.draws_per_cycle, 6);
        assert_eq!(default_state.config.draws_per_color, 2);

        // 验证默认奖品
        assert_eq!(default_state.available_prizes.len(), 6);
        assert_eq!(default_state.available_prizes.iter().filter(|p| matches!(p.color, PrizeColor::Red)).count(), 2);
        assert_eq!(default_state.available_prizes.iter().filter(|p| matches!(p.color, PrizeColor::Yellow)).count(), 2);
        assert_eq!(default_state.available_prizes.iter().filter(|p| matches!(p.color, PrizeColor::Blue)).count(), 2);

        // 验证默认周期
        assert!(!default_state.current_cycle.completed);
        assert_eq!(default_state.current_cycle.results.len(), 0);
        assert_eq!(default_state.current_cycle.remaining_draws.red, 2);
        assert_eq!(default_state.current_cycle.remaining_draws.yellow, 2);
        assert_eq!(default_state.current_cycle.remaining_draws.blue, 2);
    }

    #[test]
    fn test_lottery_state_validation() {
        let valid_state = create_default_state();
        let validation_result = validate_lottery_state(&valid_state);
        assert!(validation_result.is_ok());
        assert!(validation_result.unwrap());

        // 测试无效配置
        let mut invalid_state = valid_state.clone();
        invalid_state.config.draws_per_cycle = 0;
        let validation_result = validate_lottery_state(&invalid_state);
        assert!(validation_result.is_ok());
        assert!(!validation_result.unwrap());

        // 测试配置不匹配
        let mut invalid_state = valid_state.clone();
        invalid_state.config.draws_per_cycle = 10; // 不等于 draws_per_color * 3
        let validation_result = validate_lottery_state(&invalid_state);
        assert!(validation_result.is_ok());
        assert!(!validation_result.unwrap());

        // 测试空奖品列表
        let mut invalid_state = valid_state.clone();
        invalid_state.available_prizes.clear();
        let validation_result = validate_lottery_state(&invalid_state);
        assert!(validation_result.is_ok());
        assert!(!validation_result.unwrap());
    }
}
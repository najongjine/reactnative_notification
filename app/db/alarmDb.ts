// db/alarmDb.ts (비동기 싱글톤 패턴 적용)

import * as SQLite from "expo-sqlite"; // 최신 비동기 API 사용

// 🚨 알람 데이터 타입을 정의합니다.
export interface Alarm {
  id: number;
  name: string;
  hour: number;
  minute: number;
  weekdays: string;
  notification_ids: string;
}

// =========================================================================
// ⭐️ 싱글톤 패턴 구현 핵심
// =========================================================================

// 1. DB 인스턴스가 아닌, DB 연결 작업을 담는 Promise를 저장하는 변수
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
const DATABASE_NAME = "alarm.db";

/**
 * DB 연결 인스턴스를 가져오는 비동기 싱글톤 함수.
 * 처음 호출될 때만 DB 연결을 수행하며, 이후에는 기존 Promise를 재사용합니다.
 */
export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    // databasePromise가 null일 때만 (첫 호출 시) DB 연결 Promise를 생성
    console.log("DB 연결 시작: openDatabaseAsync...");
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  // Promise가 완료될 때까지 기다리고, 단일 DB 인스턴스를 반환
  return databasePromise;
};

// =========================================================================
// SQLite 데이터베이스 CRUD 함수 (getDb() 사용으로 수정)
// =========================================================================

// 1. 데이터베이스 테이블 초기화
export async function initDatabase() {
  // ⭐️ 싱글톤 인스턴스를 가져옵니다.
  const db = await getDb();

  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      weekdays TEXT NOT NULL,
      notification_ids TEXT NOT NULL
    );`
  );
  console.log("Database initialized: 'alarms' table checked.");
}

// 2. 알람 저장/업데이트
export async function saveAlarm(
  id: number,
  name: string,
  hour: number,
  minute: number,
  weekdays: number[],
  notificationIds: string[]
): Promise<number> {
  // ⭐️ 싱글톤 인스턴스를 가져옵니다.
  const db = await getDb();

  const weekdaysStr = weekdays.join(",");
  const notificationIdsStr = notificationIds.join(",");

  if (id > 0 && (await getAlarmById(id))) {
    // ⭐️ 업데이트 (수정 모드)
    await db.runAsync(
      `UPDATE alarms SET name = ?, hour = ?, minute = ?, weekdays = ?, notification_ids = ? WHERE id = ?;`,
      name,
      hour,
      minute,
      weekdaysStr,
      notificationIdsStr,
      id
    );
    return id;
  } else {
    // ⭐️ 삽입 (새 알람)
    const result = await db.runAsync(
      `INSERT INTO alarms (name, hour, minute, weekdays, notification_ids) VALUES (?, ?, ?, ?, ?);`,
      name,
      hour,
      minute,
      weekdaysStr,
      notificationIdsStr
    );
    return result.lastInsertRowId;
  }
}

// 3. 특정 알람 정보 불러오기
export async function getAlarmById(id: number): Promise<Alarm | null> {
  // ⭐️ 싱글톤 인스턴스를 가져옵니다.
  const db = await getDb();

  const result = await db.getFirstAsync<Alarm>(
    `SELECT * FROM alarms WHERE id = ?;`,
    id
  );
  return result || null;
}

// 4. 모든 알람 정보 불러오기 (목록 화면에서 사용)
export async function getAllAlarms(): Promise<Alarm[]> {
  // ⭐️ 싱글톤 인스턴스를 가져옵니다.
  const db = await getDb();

  const result = await db.getAllAsync<Alarm>(
    `SELECT * FROM alarms ORDER BY hour, minute;`
  );
  return result;
}

// 5. 알람 삭제
export async function deleteAlarmById(id: number) {
  // ⭐️ 싱글톤 인스턴스를 가져옵니다.
  const db = await getDb();

  await db.runAsync(`DELETE FROM alarms WHERE id = ?;`, id);
}

// 6. 문자열을 숫자 배열로 변환하는 유틸리티
export function parseWeekdays(weekdayString: string): number[] {
  if (!weekdayString) return [];
  return weekdayString
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n));
}

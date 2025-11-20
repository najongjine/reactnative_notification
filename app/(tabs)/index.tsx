import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 지정된 시간/분까지 남은 초를 계산합니다.
 * @param {number} targetHour - 목표 시 (0-23)
 * @param {number} targetMinute - 목표 분 (0-59)
 * @returns {number} 다음 목표 시간까지 남은 초
 */
function calculateDelaySeconds(targetHour, targetMinute) {
  // 1. 현재 시간
  const now = new Date();

  // 2. 오늘 목표 시간 설정
  let targetDate = new Date();
  targetDate.setHours(targetHour, targetMinute, 0, 0); // 초, 밀리초는 0으로 초기화

  // 3. 목표 시간이 이미 지났다면, 목표 시간을 내일로 설정
  // (예: 현재 오후 3시인데, 목표가 오전 8시라면 내일 오전 8시로)
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // 4. 지연 시간 (밀리초) 계산
  const delayMilliseconds = targetDate.getTime() - now.getTime();

  // 5. 초 단위로 반올림하여 반환
  const delaySeconds = Math.round(delayMilliseconds / 1000);

  // 최소 1초 이상이어야 합니다.
  return Math.max(1, delaySeconds);
}
async function schedulePushNotification() {
  // 현재 시간으로부터 2분 후의 Date 객체를 생성합니다.
  const twoMinutesLaterDate = new Date(Date.now() + 2 * 60 * 1000); // 현재 날짜 및 시간을 가져옵니다.
  const repeatYear = twoMinutesLaterDate.getFullYear();
  const repeatMonth = twoMinutesLaterDate.getMonth() + 1; // getMonth()는 0부터 시작하므로 1을 더합니다.
  const repeatDay = twoMinutesLaterDate.getDate();
  const repeatHour = twoMinutesLaterDate.getHours();
  const repeatMinute = twoMinutesLaterDate.getMinutes(); // 현재 요일(1=일요일, 7=토요일)을 가져옵니다. // Date.getDay()는 0(일요일)부터 6(토요일)까지 반환하므로, 캘린더 트리거의 1(월요일)부터 7(일요일)까지의 포맷으로 조정합니다.
  // 주의: Expo Calendar Trigger의 'weekday'는 1=일요일, 2=월요일, ..., 7=토요일을 사용합니다.
  // Date.getDay()의 값(0=일요일, 1=월요일, ..., 6=토요일)에 1을 더하면 해당 포맷이 됩니다.
  const repeatWeekday = twoMinutesLaterDate.getDay() + 1;

  // 1. 다음 목표 시간까지 남은 초를 계산합니다.
  const delayInSeconds = calculateDelaySeconds(repeatHour, repeatMinute);

  // 2. 기존 알림을 모두 취소 (중복 방지)
  await Notifications.cancelAllScheduledNotificationsAsync();

  const highPriorityAlarmId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${repeatHour}시 ${repeatMinute}분에 예약된 알림입니다.`,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delayInSeconds,
      repeats: true,
    },
  });

  // 💡 추가된 코드: 스케줄링 성공 로그
  console.log(`✅ 알림이 성공적으로 스케줄링되었습니다.`);
  console.log(`   - ID: ${highPriorityAlarmId}`);
  console.log(`   - 다음 알림 시간: ${delayInSeconds}초 후`);
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("myNotificationChannel", {
      name: "A channel is needed for the permissions prompt to appear",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS projectId is used here.
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      token = `${e}`;
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}

export default function HomeScreen() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>(
    []
  );
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >(undefined);

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => token && setExpoPushToken(token)
    );

    if (Platform.OS === "android") {
      Notifications.getNotificationChannelsAsync().then((value) =>
        setChannels(value ?? [])
      );
    }
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <ScrollView>
      <Text>Home Screen</Text>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        <Text>Your expo push token: {expoPushToken}</Text>
        <Text>{`Channels: ${JSON.stringify(
          channels.map((c) => c.id),
          null,
          2
        )}`}</Text>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Text>
            Title: {notification && notification.request.content.title}{" "}
          </Text>
          <Text>Body: {notification && notification.request.content.body}</Text>
          <Text>
            Data:{" "}
            {notification && JSON.stringify(notification.request.content.data)}
          </Text>
        </View>
        <Button
          title="Press to schedule a notification"
          onPress={async () => {
            await schedulePushNotification();
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});

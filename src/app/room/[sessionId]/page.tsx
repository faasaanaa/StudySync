import StudyRoomClient from './RoomClient';

export async function generateStaticParams() {
  return [{ sessionId: 'placeholder' }];
}

export default function StudyRoomPage() {
  return <StudyRoomClient />;
}

import ProfileClient from './ProfileClient';

export async function generateStaticParams() {
  return [{ uid: 'placeholder' }];
}

export default function ProfilePage() {
  return <ProfileClient />;
}

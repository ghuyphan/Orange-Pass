interface UserRecord {
    id: string;
    username: string;
    name: string;
    email: string;
    avatar: string | object;
    verified: boolean;
  }
export default UserRecord
export type User = {
  id: string;
  email: string;
  displayName: string;
};

export type Room = {
  id: string;
  name: string;
  createdAt: string;
};

export type Message = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; displayName: string };
};

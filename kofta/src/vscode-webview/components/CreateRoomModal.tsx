import { Form, Formik } from "formik";
import React from "react";
import { useHistory } from "react-router-dom";
import { wsend, wsFetch } from "../../createWebsocket";
import { useCurrentRoomStore } from "../../webrtc/stores/useCurrentRoomStore";
import { useRoomChatStore } from "../modules/room-chat/useRoomChatStore";
import { roomToCurrentRoom } from "../utils/roomToCurrentRoom";
import { showErrorToast } from "../utils/showErrorToast";
import { Button } from "./Button";
import { InputField } from "./form-fields/InputField";
import { Modal } from "./Modal";

interface CreateRoomModalProps {
	onRequestClose: () => void;
	name?: string;
	description?: string;
	isPrivate?: boolean;
	edit?: boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
	onRequestClose,
	name: currentName,
	description: currentDescription,
	isPrivate,
	edit,
}) => {
	const history = useHistory();
	return (
		<Modal isOpen onRequestClose={onRequestClose}>
			<Formik<{
				name: string;
				privacy: string;
				description?: string;
			}>
				initialValues={{
					name: currentName || "",
					description: currentDescription || "",
					privacy: isPrivate ? "private" : "public",
				}}
				validateOnChange={false}
				validateOnBlur={false}
				validate={({ name }) => {
					const errors: Record<string, string> = {};

					if (name.length < 2) {
						return {
							name: "min length 2",
						};
					}

					return errors;
				}}
				onSubmit={async ({ name, privacy, description }) => {
					if (edit) {
						wsend({
							op: "edit_room",
							d: { name, description, privacy },
						});
					} else {
						const resp = await wsFetch<any>({
							op: "create_room",
							d: { name, privacy, description },
						});
						if (resp.error) {
							showErrorToast(resp.d);
							return;
						} else if (resp.room) {
							const { room } = resp;
							console.log("new room voice server id: " + room.voiceServerId);
							useRoomChatStore.getState().clearChat();
							wsend({ op: "get_current_room_users", d: {} });
							history.push("/room/" + room.id);
							useCurrentRoomStore
								.getState()
								.setCurrentRoom(() => roomToCurrentRoom(room));
						}
					}

					onRequestClose();
				}}
			>
				{({ setFieldValue, values, isSubmitting }) => (
					<Form>
						<InputField
							name="name"
							maxLength={60}
							placeholder="room name"
							autoFocus
						/>
						<div className="mt-3">
							<InputField
								name="description"
								maxLength={500}
								placeholder="room description"
								textarea
							/>
						</div>
						<div className={`grid mt-8 items-start grid-cols-1`}>
							<select
								className={`border border-simple-gray-3c`}
								value={values.privacy}
								onChange={(e) => {
									const v = e.target.value;
									setFieldValue("privacy", v);
								}}
							>
								<option value="public" className={`bg-simple-gray-3c`}>
									public
								</option>
								<option value="private" className={`bg-simple-gray-3c`}>
									private
								</option>
							</select>
						</div>

						<div className={`flex mt-12`}>
							<Button
								type="button"
								onClick={onRequestClose}
								className={`mr-1.5`}
								color="secondary"
							>
								cancel
							</Button>
							<Button loading={isSubmitting} type="submit" className={`ml-1.5`}>
								ok
							</Button>
						</div>
					</Form>
				)}
			</Formik>
		</Modal>
	);
};

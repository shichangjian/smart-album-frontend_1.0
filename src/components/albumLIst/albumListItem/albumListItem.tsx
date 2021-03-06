import React, {ChangeEvent, Component, FormEvent} from 'react';
import {Link} from "react-router-dom";
import style from './albumListItem.module.css';
import {Button, Dropdown, Form, Icon, Input, Menu, message, Modal, Popconfirm, Radio, Select, Tag, Tooltip} from "antd";
import Axios from "axios";
import {FormComponentProps} from "antd/lib/form";
import CustomSpin from "../../CustomSpin/CustomSpin";
import {observer} from "mobx-react";
import {albumListMobx} from "../../../mobx/albumListMobx";
import {PhotoPageProperties, PhotoProperties} from "../../../mobx/photoListMobx";
import {picThumbnailUrlPrefix} from "../../../index";
import {elseError} from "../../../pages/signup/signup";
interface Props extends FormComponentProps{
    id: number;
    cover:number;//url
    title: string;
    createTime: string;
    description: string;
    className?: string;
    photoAmount: number;
}
interface State {
    editVisible: boolean;
    mergeVisible: boolean;
    photoListData: PhotoPageProperties;
}
@observer
class AlbumListItem extends Component<Props,State> {
    readonly form: React.RefObject<HTMLFormElement> = React.createRef();
    constructor(props:any) {
        super(props);
        this.state = {                         //那个创建相册 底下不更新问题  到时候mobx解决下
            editVisible: false,
            photoListData: undefined,
            mergeVisible: false
        };
    }
    onOpenEditModal=()=>{
        this.setState({editVisible: true},()=>{   //这个勉强能用了 可能还要改
            //请求photolist
            Axios.get('/api/album/getAlbumPhotos',{
                params:{albumId: this.props.id,page:-10086}
            }).then(value => {
                this.setState({photoListData: value.data})
            }).catch(err=>{
                message.error("获取相册列表失败")
            })
        })
    }
    onSubmitEditModal=()=>{
        let name = this.props.form.getFieldValue("albumName");
        if (!name) {
            name = "";
        }
        let description = this.props.form.getFieldValue("albumDescription");
        if (!description) {
            description = "";
        }
        let isPublic = this.props.form.getFieldValue("isPublic") === "isPublic" ? 1 : 0;
        let photoId = this.props.form.getFieldValue("cover");
        let albumId = this.props.id;
        Axios.post("/api/album/edit",{
            name,description,albumId, photoId, isPublic
        }).then(value => {
            if (value.data.status === 'ok') {
                message.success("修改成功!");
                this.setState({editVisible:false})
                albumListMobx.getAlbumList()
            }
        }).catch(err=>{
            let msg = err.data.message;
            if (msg === 'forbidden edit') {
                message.error('禁止编辑默认相册');
            } else {
                elseError();
            }
        })
        
    }
    onCloseEditModal=()=>{
        this.setState({editVisible: !this.state.editVisible})
    }
    onDeleteClick=()=>{
        albumListMobx.deleteAlbum(this.props.id);
    }
    onSelectCoverClick=()=>{
        //this.setState({showPhotoList: true})
    }
    onDownloadClick=()=>{
        let formData = new FormData();
        formData.append("albumId", this.props.id+"");
        Axios.post("/api/album/download",formData,{
            responseType: "blob"
        }).then(value => {
            let blob = new Blob([value.data]);
            let link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.setAttribute("download", `${this.props.title} || "相册"}.zip`);
            link.click();
        })
    }
    onMergeAlbumsClick=()=> {
        this.setState({mergeVisible: true})
        albumListMobx.getAlbumList();
    }
    onMergeAlbumsCancel=()=>{
        this.setState({mergeVisible: false})
    }
    onMergeSubmit=(e:FormEvent)=>{
        e.preventDefault();
        let selfAlbumId = this.props.id;
        let moveToAlbumId = this.props.form.getFieldValue("mergeToAlbum");
        if (!moveToAlbumId) {
            return;
        }
        Axios.get("/api/album/merge",{
            params:{
                firstAlbumId:selfAlbumId,
                secondAlbumId: moveToAlbumId
            }
        }).then(value => {
            if (value.data.status === 'ok') {
                message.success("合并成功");
                albumListMobx.getAlbumList();
            }
        }).catch(err=>{
            message.error("合并失败");
        })
    }
    render() {
        const MenuItem = Menu.Item;
        const FormItem = Form.Item;
        const RadioGroup = Radio.Group;
        const getFieldDecorator = this.props.form.getFieldDecorator;
        const overlay = <Menu>
            <MenuItem onClick={this.onOpenEditModal}>编辑相册</MenuItem>
            <MenuItem>分享</MenuItem>
            <MenuItem>
                <Popconfirm title={"确定删除吗"} onConfirm={this.onDeleteClick}>
                    删除相册
                </Popconfirm>
            </MenuItem>
            <MenuItem onClick={this.onDownloadClick}>下载相册</MenuItem>
            <MenuItem onClick={this.onMergeAlbumsClick}>相册合并</MenuItem>
        </Menu>;
        return (
          <div className={this.props.className}>
              <div className={style.wrapper}>
                  <Link to={'/albumlist/' + this.props.id}>
                      <img className={style.img} src={"/api/photo/showThumbnail?photoId=" + this.props.cover}/>
                      <h3 style={{marginTop: 15}}>{this.props.title}</h3>
                  </Link>
                  <Dropdown overlay={overlay}>
                      <Link to={'#'} className={style["more-icon"]}><Icon type="more"/></Link>
                  </Dropdown>
                  <div className={style['photo-amount']}>
                      {this.props.photoAmount}张
                  </div>
              </div>
              <Modal destroyOnClose visible={this.state.editVisible} onCancel={this.onCloseEditModal}
                     onOk={this.onSubmitEditModal}>
                  <Form className={style['edit-modal-form']}>
                      <FormItem label={'相册名'}>
                          {getFieldDecorator("albumName", {
                              initialValue: albumListMobx.albumList.length !== 0 ? albumListMobx.albumList.filter((value, index) => {
                                  return value.albumId === this.props.id
                              })[0].name : ""
                          })(
                            <Input type={"text"}/>
                          )}
                      </FormItem>
                      <FormItem label={"相册描述"}>
                          {getFieldDecorator("albumDescription", {
                              initialValue: albumListMobx.albumList.length !== 0 ? albumListMobx.albumList.filter((value, index) => {
                                  return value.albumId === this.props.id
                              })[0].description : ""
                          })(
                            <Input type={"text"}/>
                          )}
                      </FormItem>
                      {this.state.photoListData ? <FormItem label={'选择封面'}>
                          {getFieldDecorator("cover", {
                              initialValue: albumListMobx.albumList.length !== 0 ? albumListMobx.albumList.filter((value, index) => {
                                  return value.albumId === this.props.id
                              })[0].cover : ""
                          })(
                            <RadioGroup className={style["photo-list"]}>
                                {this.state.photoListData.photos.map(value => {
                                    return <Radio key={value.photoId} value={value.photoId}>
                                        <img style={{maxWidth: "100%"}} src={picThumbnailUrlPrefix + value.photoId}/>
                                    </Radio>
                                })}
                            </RadioGroup>
                          )}
                      </FormItem> : <CustomSpin/>}
                  </Form>
              </Modal>
              <Modal destroyOnClose visible={this.state.mergeVisible} onCancel={this.onMergeAlbumsCancel}
                     footer={false}>
                  <Form onSubmit={this.onMergeSubmit}>
                      <Form.Item label={'选择要合并至的相册,合并后此相册会被删除'}>
                          {
                              this.props.form.getFieldDecorator("mergeToAlbum")(
                                <Select>
                                    {albumListMobx.albumList ? albumListMobx.albumList.filter(value => value.albumId !== this.props.id).map(value1 => {
                                        return <Select.Option key={value1.albumId + ""}
                                                              value={value1.albumId}>{value1.name}</Select.Option>;
                                    }) : null}
                                </Select>
                              )
                          }
                      </Form.Item>
                      <div style={{textAlign: "right"}}>
                          <Button htmlType={'submit'}>确认合并</Button>
                      </div>
                  </Form>
          
              </Modal>
          </div>
        );
    }
}

export default Form.create()(AlbumListItem);
